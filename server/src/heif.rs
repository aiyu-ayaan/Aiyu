//! HEIC/HEIF decoding with the system's libheif, loaded when first needed (package `libheif1`, plus
//! `libheif-plugin-libde265` where decoders are plugins). Loading at run time keeps the build free of C headers.

use libloading::Library;
use std::{
    ffi::{c_char, c_int, c_void},
    ptr,
    sync::LazyLock,
};

#[repr(C)]
struct HeifError {
    code: c_int,
    subcode: c_int,
    message: *const c_char,
}

type Opaque = *mut c_void;
const COLORSPACE_RGB: c_int = 1;
const CHROMA_RGB: c_int = 10;
const CHROMA_RGBA: c_int = 11;
const CHANNEL_INTERLEAVED: c_int = 10;

struct Api {
    context_alloc: unsafe extern "C" fn() -> Opaque,
    context_free: unsafe extern "C" fn(Opaque),
    read_memory: unsafe extern "C" fn(Opaque, *const u8, usize, *const c_void) -> HeifError,
    primary_handle: unsafe extern "C" fn(Opaque, *mut Opaque) -> HeifError,
    handle_release: unsafe extern "C" fn(Opaque),
    handle_width: unsafe extern "C" fn(Opaque) -> c_int,
    handle_height: unsafe extern "C" fn(Opaque) -> c_int,
    handle_has_alpha: unsafe extern "C" fn(Opaque) -> c_int,
    decode: unsafe extern "C" fn(Opaque, *mut Opaque, c_int, c_int, *const c_void) -> HeifError,
    image_release: unsafe extern "C" fn(Opaque),
    image_width: unsafe extern "C" fn(Opaque, c_int) -> c_int,
    image_height: unsafe extern "C" fn(Opaque, c_int) -> c_int,
    plane: unsafe extern "C" fn(Opaque, c_int, *mut c_int) -> *const u8,
    /// Keeps the functions above loaded.
    _library: Library,
}

fn load() -> Result<Api, libloading::Error> {
    // SAFETY: libheif's initializers have no preconditions, and each symbol is declared with the signature of
    // libheif/heif.h, stable since libheif 1.0.
    unsafe {
        let library = Library::new("libheif.so.1")?;
        macro_rules! symbol {
            ($name:literal) => {
                *library.get(concat!($name, "\0").as_bytes())?
            };
        }
        Ok(Api {
            context_alloc: symbol!("heif_context_alloc"),
            context_free: symbol!("heif_context_free"),
            read_memory: symbol!("heif_context_read_from_memory_without_copy"),
            primary_handle: symbol!("heif_context_get_primary_image_handle"),
            handle_release: symbol!("heif_image_handle_release"),
            handle_width: symbol!("heif_image_handle_get_width"),
            handle_height: symbol!("heif_image_handle_get_height"),
            handle_has_alpha: symbol!("heif_image_handle_has_alpha_channel"),
            decode: symbol!("heif_decode_image"),
            image_release: symbol!("heif_image_release"),
            image_width: symbol!("heif_image_get_width"),
            image_height: symbol!("heif_image_get_height"),
            plane: symbol!("heif_image_get_plane_readonly"),
            _library: library,
        })
    }
}

static API: LazyLock<Result<Api, String>> = LazyLock::new(|| load().map_err(|e| format!("libheif is not available: {e}")));

/// Frees a libheif object when dropped.
struct Owned(Opaque, unsafe extern "C" fn(Opaque));

impl Drop for Owned {
    fn drop(&mut self) {
        if !self.0.is_null() {
            // SAFETY: the pointer came from the matching libheif constructor and is released once.
            unsafe { (self.1)(self.0) }
        }
    }
}

fn check(error: HeifError, step: &str) -> anyhow::Result<()> {
    anyhow::ensure!(error.code == 0, "HEIF {step} failed (code {}/{})", error.code, error.subcode);
    Ok(())
}

pub struct Decoded {
    pub width: u32,
    pub height: u32,
    pub alpha: bool,
    /// Tightly packed 8-bit RGB or RGBA, with the file's rotation and mirroring applied.
    pub pixels: Vec<u8>,
}

/// The primary picture of a HEIF file, refused above `max_pixels`.
pub fn decode(data: &[u8], max_pixels: u64) -> anyhow::Result<Decoded> {
    let api = API.as_ref().map_err(|e| anyhow::anyhow!(e.clone()))?;
    // SAFETY: calls follow libheif's ownership rules; `data` outlives the context, which is declared first and so
    // dropped after the handle and the image; plane reads stay within `stride * height`.
    unsafe {
        let context = Owned((api.context_alloc)(), api.context_free);
        anyhow::ensure!(!context.0.is_null(), "HEIF context allocation failed");
        check((api.read_memory)(context.0, data.as_ptr(), data.len(), ptr::null()), "read")?;
        let mut handle = Owned(ptr::null_mut(), api.handle_release);
        check((api.primary_handle)(context.0, &mut handle.0), "primary image")?;
        let (w, h) = ((api.handle_width)(handle.0), (api.handle_height)(handle.0));
        anyhow::ensure!(w > 0 && h > 0 && w as u64 * h as u64 <= max_pixels, "HEIF image size {w}x{h} is not supported");
        let alpha = (api.handle_has_alpha)(handle.0) != 0;
        let mut image = Owned(ptr::null_mut(), api.image_release);
        let chroma = if alpha { CHROMA_RGBA } else { CHROMA_RGB };
        check((api.decode)(handle.0, &mut image.0, COLORSPACE_RGB, chroma, ptr::null()), "decode")?;
        let width = (api.image_width)(image.0, CHANNEL_INTERLEAVED);
        let height = (api.image_height)(image.0, CHANNEL_INTERLEAVED);
        anyhow::ensure!(width > 0 && height > 0 && width as u64 * height as u64 <= max_pixels, "HEIF decoded size {width}x{height} is not supported");
        let mut stride: c_int = 0;
        let plane = (api.plane)(image.0, CHANNEL_INTERLEAVED, &mut stride);
        let row = width as usize * if alpha { 4 } else { 3 };
        anyhow::ensure!(!plane.is_null() && stride as usize >= row, "HEIF image has no pixels");
        let mut pixels = Vec::with_capacity(row * height as usize);
        for y in 0..height as usize {
            pixels.extend_from_slice(std::slice::from_raw_parts(plane.add(y * stride as usize), row));
        }
        Ok(Decoded { width: width as u32, height: height as u32, alpha, pixels })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// `HEIF_SAMPLE=photo.heic cargo test heif -- --ignored`: needs libheif and a real file.
    #[test]
    #[ignore = "needs libheif and a sample file"]
    fn decodes_a_sample() {
        let data = std::fs::read(std::env::var("HEIF_SAMPLE").expect("HEIF_SAMPLE")).unwrap();
        let out = decode(&data, 100_000_000).unwrap();
        assert_eq!(out.pixels.len(), out.width as usize * out.height as usize * if out.alpha { 4 } else { 3 });
        assert!(out.pixels.iter().any(|p| *p != out.pixels[0]));
        eprintln!("{}x{} alpha={}", out.width, out.height, out.alpha);
        assert!(decode(&data[..data.len() / 2], 100_000_000).is_err());
        assert!(decode(&data, 4).is_err());
    }
}
