//! Uploaded images (src/utils/fileValidation.js and imageProcessing.js): type checks by file signature, conversion
//! to WebP with a 2500 px cap, and 800 px thumbnails. EXIF (with the orientation) and the colour profile are kept.

use fast_image_resize::{self as fr, images::Image};
use image::{DynamicImage, ImageDecoder, ImageReader, Limits};
use img_parts::{Bytes, ImageEXIF, ImageICC, webp::WebP};
use libwebp_sys as webp;
use std::io::Cursor;

use crate::heif;

/// Far above any camera that fits in the 10 MB upload limit; each pixel costs up to 4 bytes while processing.
const MAX_PIXELS: u64 = 100_000_000;
pub const MAX_FILE_SIZE: usize = 10 * 1024 * 1024;
const HUGE: u32 = 2500;
const THUMBNAIL_WIDTH: u32 = 800;

const ALLOWED: [&str; 6] = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

// ── validation ─────────────────────────────────────────────────────────────────────────────────────────

/// "image/heic" or "image/heif" for an ISO-BMFF file with a HEIF major brand.
pub fn detect_heif(data: &[u8]) -> Option<&'static str> {
    if data.len() < 12 || &data[4..8] != b"ftyp" {
        return None;
    }
    match &data[8..12] {
        b"heic" | b"heix" | b"hevc" | b"hevx" | b"heim" | b"heis" | b"hevm" | b"hevs" => Some("image/heic"),
        b"mif1" | b"msf1" | b"mif2" => Some("image/heif"),
        _ => None,
    }
}

fn signature_matches(data: &[u8], mime: &str) -> bool {
    match mime {
        "image/jpeg" => data.starts_with(&[0xFF, 0xD8, 0xFF]),
        "image/png" => data.starts_with(b"\x89PNG\r\n\x1a\n"),
        "image/webp" => data.starts_with(b"RIFF"),
        "image/gif" => data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a"),
        "image/heic" | "image/heif" => detect_heif(data).is_some(),
        _ => false,
    }
}

/// `validateUploadedFile`: the file's real type, or the message for the uploader.
pub fn validate(declared: &str, data: &[u8]) -> Result<String, String> {
    let mut mime = declared;
    if mime.is_empty() || mime == "application/octet-stream" {
        mime = detect_heif(data).unwrap_or(mime);
    }
    if !ALLOWED.contains(&mime) {
        // An unknown label is replaced by what the bytes say.
        let found = detect_heif(data).or_else(|| ["image/jpeg", "image/png", "image/webp", "image/gif"].into_iter().find(|t| signature_matches(data, t)));
        mime = found.ok_or_else(|| format!("Invalid file type. Allowed types: {}. SVG is not allowed for security reasons.", ALLOWED.join(", ")))?;
    }
    if data.is_empty() || data.len() > MAX_FILE_SIZE {
        return Err(format!("File size must be between 1 byte and {}MB", MAX_FILE_SIZE / 1024 / 1024));
    }
    if !signature_matches(data, mime) {
        return Err("File signature does not match declared type. Possible malicious file detected.".into());
    }
    Ok(mime.to_string())
}

// ── decoding ───────────────────────────────────────────────────────────────────────────────────────────

#[derive(Default, Clone)]
struct Metadata {
    exif: Option<Bytes>,
    icc: Option<Bytes>,
}

struct Picture {
    width: u32,
    height: u32,
    alpha: bool,
    pixels: Vec<u8>,
    meta: Metadata,
}

fn is_webp(data: &[u8]) -> bool {
    data.len() >= 12 && &data[..4] == b"RIFF" && &data[8..12] == b"WEBP"
}

fn reader(data: &[u8]) -> anyhow::Result<ImageReader<Cursor<&[u8]>>> {
    let mut reader = ImageReader::new(Cursor::new(data)).with_guessed_format()?;
    let mut limits = Limits::default();
    limits.max_alloc = Some(MAX_PIXELS * 4);
    reader.limits(limits);
    Ok(reader)
}

/// Width and height as stored (before any EXIF rotation), without decoding the pixels.
pub fn dimensions(data: &[u8]) -> anyhow::Result<(u32, u32)> {
    let (w, h) = reader(data)?.into_dimensions()?;
    anyhow::ensure!(u64::from(w) * u64::from(h) <= MAX_PIXELS, "image is too large");
    Ok((w, h))
}

fn metadata(data: &[u8]) -> Metadata {
    match img_parts::DynImage::from_bytes(Bytes::copy_from_slice(data)) {
        Ok(Some(parts)) => Metadata { exif: parts.exif(), icc: parts.icc_profile() },
        _ => Metadata::default(),
    }
}

fn decode(data: &[u8]) -> anyhow::Result<Picture> {
    if detect_heif(data).is_some() {
        // The converted photo carries no metadata: libheif has already applied the rotation.
        let d = heif::decode(data, MAX_PIXELS)?;
        return Ok(Picture { width: d.width, height: d.height, alpha: d.alpha, pixels: d.pixels, meta: Metadata::default() });
    }
    dimensions(data)?;
    let decoder = reader(data)?.into_decoder()?;
    let colour = decoder.original_color_type();
    let image = DynamicImage::from_decoder(decoder)?;
    let mut meta = metadata(data);
    // A gray or CMYK profile does not describe the RGB pixels that are written.
    let rgb_source = !matches!(colour, image::ExtendedColorType::L8 | image::ExtendedColorType::La8 | image::ExtendedColorType::L16 | image::ExtendedColorType::La16 | image::ExtendedColorType::Cmyk8);
    if !rgb_source {
        meta.icc = None;
    }
    let (width, height, alpha) = (image.width(), image.height(), image.color().has_alpha());
    let pixels = if alpha { image.into_rgba8().into_raw() } else { image.into_rgb8().into_raw() };
    Ok(Picture { width, height, alpha, pixels, meta })
}

// ── resizing and encoding ──────────────────────────────────────────────────────────────────────────────

/// The size inside `max_width` x `max_height` with the same shape, never larger (sharp's `fit: 'inside'`).
fn fit(width: u32, height: u32, max_width: u32, max_height: u32) -> (u32, u32) {
    let scale = (f64::from(max_width) / f64::from(width)).min(f64::from(max_height) / f64::from(height)).min(1.0);
    let side = |v: u32| ((f64::from(v) * scale).round() as u32).max(1);
    (side(width), side(height))
}

/// Lanczos3 in linear light (sharp's `gamma()`), so downscaling does not darken fine detail.
fn resize(picture: Picture, width: u32, height: u32) -> anyhow::Result<Picture> {
    if (width, height) == (picture.width, picture.height) {
        return Ok(picture);
    }
    let (small, wide) = if picture.alpha { (fr::PixelType::U8x4, fr::PixelType::U16x4) } else { (fr::PixelType::U8x3, fr::PixelType::U16x3) };
    let mapper = fr::create_gamma_22_mapper();
    let source = Image::from_vec_u8(picture.width, picture.height, picture.pixels, small)?;
    let mut linear = Image::new(picture.width, picture.height, wide);
    mapper.forward_map(&source, &mut linear)?;
    drop(source);
    let mut scaled = Image::new(width, height, wide);
    let options = fr::ResizeOptions::new().resize_alg(fr::ResizeAlg::Convolution(fr::FilterType::Lanczos3));
    fr::Resizer::new().resize(&linear, &mut scaled, &options)?;
    drop(linear);
    let mut out = Image::new(width, height, small);
    mapper.backward_map(&scaled, &mut out)?;
    Ok(Picture { width, height, alpha: picture.alpha, pixels: out.into_vec(), meta: picture.meta })
}

fn encode(picture: &Picture, quality: f32, sharp_yuv: bool) -> anyhow::Result<Vec<u8>> {
    anyhow::ensure!(picture.width <= 16_383 && picture.height <= 16_383, "image is too large for WebP");
    let channels = if picture.alpha { 4 } else { 3 };
    anyhow::ensure!(picture.pixels.len() == picture.width as usize * picture.height as usize * channels, "pixel buffer size");
    // SAFETY: the picture and writer are initialised by libwebp's own functions, the pixel buffer length was just
    // checked against width, height and stride, and both are freed on every path.
    let encoded = unsafe {
        let mut config = webp::WebPConfig::new().map_err(|_| anyhow::anyhow!("WebP setup failed"))?;
        config.quality = quality;
        config.method = 4;
        config.use_sharp_yuv = i32::from(sharp_yuv);
        let mut frame = webp::WebPPicture::new().map_err(|_| anyhow::anyhow!("WebP setup failed"))?;
        frame.use_argb = 1;
        frame.width = picture.width as i32;
        frame.height = picture.height as i32;
        let mut writer = std::mem::MaybeUninit::<webp::WebPMemoryWriter>::uninit();
        webp::WebPMemoryWriterInit(writer.as_mut_ptr());
        let mut writer = writer.assume_init();
        frame.writer = Some(webp::WebPMemoryWrite);
        frame.custom_ptr = (&mut writer as *mut webp::WebPMemoryWriter).cast();
        let stride = (picture.width as usize * channels) as i32;
        let imported = if picture.alpha {
            webp::WebPPictureImportRGBA(&mut frame, picture.pixels.as_ptr(), stride)
        } else {
            webp::WebPPictureImportRGB(&mut frame, picture.pixels.as_ptr(), stride)
        };
        let ok = imported != 0 && webp::WebPEncode(&config, &mut frame) != 0;
        let out = ok.then(|| std::slice::from_raw_parts(writer.mem, writer.size).to_vec());
        webp::WebPPictureFree(&mut frame);
        webp::WebPMemoryWriterClear(&mut writer);
        out.ok_or_else(|| anyhow::anyhow!("WebP encoding failed"))?
    };
    attach(encoded, &picture.meta, picture.alpha)
}

/// Marks in the extended header what the file carries: img-parts leaves the EXIF bit unset, and readers then skip
/// the chunk (and with it the orientation).
fn set_flags(file: &mut [u8], meta: &Metadata, alpha: bool) {
    if file.len() > 20 && &file[12..16] == b"VP8X" {
        for (present, bit) in [(meta.icc.is_some(), 0x20), (alpha, 0x10), (meta.exif.is_some(), 0x08)] {
            if present {
                file[20] |= bit;
            }
        }
    }
}

fn attach(encoded: Vec<u8>, meta: &Metadata, alpha: bool) -> anyhow::Result<Vec<u8>> {
    if meta.exif.is_none() && meta.icc.is_none() {
        return Ok(encoded);
    }
    let mut file = WebP::from_bytes(Bytes::from(encoded))?;
    // The extended header written for metadata takes its size from these dimensions.
    file.set_icc_profile(meta.icc.clone());
    file.set_exif(meta.exif.clone());
    let mut out = file.encoder().bytes().to_vec();
    set_flags(&mut out, meta, alpha);
    Ok(out)
}

pub struct Processed {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

/// `processUploadedImage`: WebP, at most 2500 px. A WebP that already fits is returned unchanged.
pub fn process(data: &[u8]) -> anyhow::Result<Processed> {
    if is_webp(data) {
        let (width, height) = dimensions(data)?;
        if width <= HUGE && height <= HUGE {
            return Ok(Processed { data: data.to_vec(), width, height });
        }
    }
    to_webp(data, 85.0, true)
}

/// Re-encodes as WebP, capped to 2500 px when `cap` is set.
pub fn to_webp(data: &[u8], quality: f32, cap: bool) -> anyhow::Result<Processed> {
    let mut picture = decode(data)?;
    if cap && (picture.width > HUGE || picture.height > HUGE) {
        let (w, h) = fit(picture.width, picture.height, HUGE, HUGE);
        picture = resize(picture, w, h)?;
    }
    Ok(Processed { data: encode(&picture, quality, false)?, width: picture.width, height: picture.height })
}

/// `generateThumbnail`: at most 800 px wide.
pub fn thumbnail(data: &[u8]) -> anyhow::Result<Processed> {
    let picture = decode(data)?;
    let (width, height) = if picture.width > THUMBNAIL_WIDTH {
        let tall = (f64::from(picture.height) / f64::from(picture.width) * f64::from(THUMBNAIL_WIDTH)).round() as u32;
        (THUMBNAIL_WIDTH, tall.max(1))
    } else {
        (picture.width, picture.height)
    };
    let (w, h) = fit(picture.width, picture.height, width, height);
    let picture = resize(picture, w, h)?;
    Ok(Processed { data: encode(&picture, 80.0, true)?, width, height })
}

/// `-thumb.webp` beside a file name.
pub fn thumbnail_name(filename: &str) -> String {
    let stem = match filename.rfind('.') {
        Some(dot) if dot > 0 => &filename[..dot],
        _ => filename,
    };
    format!("{stem}-thumb.webp")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn png(width: u32, height: u32, alpha: bool) -> Vec<u8> {
        let image = if alpha {
            DynamicImage::ImageRgba8(image::RgbaImage::from_fn(width, height, |x, _| image::Rgba([200, 40, 40, (x % 256) as u8])))
        } else {
            DynamicImage::ImageRgb8(image::RgbImage::from_pixel(width, height, image::Rgb([200, 40, 40])))
        };
        let mut out = Cursor::new(Vec::new());
        image.write_to(&mut out, image::ImageFormat::Png).unwrap();
        out.into_inner()
    }

    #[test]
    fn validation_follows_the_bytes() {
        let p = png(1, 1, false);
        assert_eq!(validate("image/png", &p), Ok("image/png".into()));
        assert_eq!(validate("text/html", &p), Ok("image/png".into()));
        assert!(validate("image/jpeg", &p).unwrap_err().contains("signature"));
        assert!(validate("image/png", b"").unwrap_err().contains("size"));
        assert!(validate("image/svg+xml", b"<svg/>").unwrap_err().starts_with("Invalid file type"));
        let heic = b"\0\0\0\x18ftypheic....";
        assert_eq!(validate("", heic), Ok("image/heic".into()));
        assert_eq!(validate("image/heif", heic), Ok("image/heif".into()));
    }

    #[test]
    fn large_pictures_are_capped_and_thumbnails_are_800_wide() {
        for alpha in [false, true] {
            let big = png(3000, 1500, alpha);
            let out = process(&big).unwrap();
            assert_eq!((out.width, out.height), (2500, 1250));
            assert!(is_webp(&out.data));
            assert_eq!(dimensions(&out.data).unwrap(), (2500, 1250));
            let thumb = thumbnail(&out.data).unwrap();
            assert_eq!((thumb.width, thumb.height, dimensions(&thumb.data).unwrap()), (800, 400, (800, 400)));
        }
        // A WebP that already fits is untouched.
        let small = process(&png(10, 20, false)).unwrap();
        assert_eq!(process(&small.data).unwrap().data, small.data);
        assert_eq!(thumbnail(&small.data).map(|t| (t.width, t.height)).unwrap(), (10, 20));
    }

    #[test]
    fn colour_survives_the_linear_light_resize() {
        let thumb = thumbnail(&png(1600, 800, false)).unwrap();
        let pixel = decode(&thumb.data).unwrap().pixels;
        assert!((pixel[0] as i32 - 200).abs() <= 3 && (pixel[1] as i32 - 40).abs() <= 3, "{:?}", &pixel[..3]);
    }

    #[test]
    fn exif_and_profile_are_kept() {
        let mut source = img_parts::png::Png::from_bytes(Bytes::from(png(900, 600, false))).unwrap();
        // A minimal TIFF header with one orientation entry (rotate 90).
        let exif = Bytes::from_static(b"II*\0\x08\0\0\0\x01\0\x12\x01\x03\0\x01\0\0\0\x06\0\0\0\0\0\0\0");
        source.set_exif(Some(exif.clone()));
        let data = source.encoder().bytes().to_vec();
        for out in [process(&data).unwrap(), thumbnail(&data).unwrap()] {
            assert_eq!(metadata(&out.data).exif.as_ref(), Some(&exif));
            // The header must announce the chunk, or decoders ignore it.
            assert_eq!((&out.data[12..16], out.data[20] & 0x08), (&b"VP8X"[..], 0x08));
            assert!(dimensions(&out.data).is_ok());
        }
    }

    #[test]
    fn broken_input_is_an_error() {
        assert!(process(b"\x89PNG\r\n\x1a\ngarbage").is_err());
        assert!(thumbnail(b"\0\0\0\x18ftypheicgarbage").is_err());
    }

    #[test]
    fn thumbnail_names() {
        assert_eq!(thumbnail_name("a.b.png"), "a.b-thumb.webp");
        assert_eq!(thumbnail_name(".x"), ".x-thumb.webp");
    }
}
