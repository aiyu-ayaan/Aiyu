//! Image uploads and the files themselves (src/app/api/upload, uploads/[filename], admin/images/upload,
//! admin/icons and src/utils/uploadImage.js).

use axum::{
    body::Body,
    extract::{FromRequest, Multipart, Path, Request, State},
    http::{StatusCode, header, request::Parts},
    response::{IntoResponse, Response},
};
use rand::Rng;
use serde_json::{Value, json};
use std::{sync::Arc, time::Duration};
use tokio::{io::AsyncWriteExt, sync::Semaphore};
use tokio_util::io::ReaderStream;

use crate::{
    AppState,
    admin_settings::failure,
    api::{error, json_status, signed_in},
    images, limit, write,
};

/// One picture is decoded at a time: a few large photos in parallel would not fit a 1 GB machine.
static PROCESSING: std::sync::LazyLock<Arc<Semaphore>> = std::sync::LazyLock::new(|| Arc::new(Semaphore::new(1)));

/// The multipart body around the largest accepted file.
pub const BODY_LIMIT: usize = images::MAX_FILE_SIZE + 1024 * 1024;

/// Runs CPU-heavy image work off the async threads, one at a time. A panic in a decoder becomes an error.
pub async fn blocking<T: Send + 'static>(work: impl FnOnce() -> anyhow::Result<T> + Send + 'static) -> anyhow::Result<T> {
    let permit = PROCESSING.clone().acquire_owned().await?;
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        work()
    })
    .await?
}

/// `sanitizeFilename`: the base name with only safe characters.
fn sanitize(name: &str) -> String {
    let base = name.rsplit(['/', '\\']).next().filter(|b| !b.is_empty()).unwrap_or("file");
    let clean: String = base.chars().filter(|c| c.is_ascii_alphanumeric() || "._-".contains(*c)).collect();
    if clean.is_empty() || clean.starts_with('.') { "upload".into() } else { clean }
}

/// `<ms>-<random>-<random>.<ext>`: nothing of the uploader's name but a known extension.
fn secure_filename(original: &str) -> String {
    let extension = sanitize(original).rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    let extension = if ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].contains(&extension.as_str()) { extension.as_str() } else { "bin" };
    let mut rng = rand::thread_rng();
    const DIGITS: &[u8; 36] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    let random: String = (0..11).map(|_| DIGITS[rng.gen_range(0..36)] as char).collect();
    format!("{}-{random}-{}.{extension}", chrono::Utc::now().timestamp_millis(), rng.gen_range(0..1_000_000))
}

fn extension(name: &str) -> &str {
    match name.rfind('.') {
        Some(dot) if dot > 0 => &name[dot + 1..],
        _ => "",
    }
}

fn stem(name: &str) -> &str {
    match name.rfind('.') {
        Some(dot) if dot > 0 => &name[..dot],
        _ => name,
    }
}

/// The name the uploader asked for, with the file's extension when it has none.
fn preferred_name(asked: &str, file: &str) -> String {
    let asked = asked.trim();
    match (asked.is_empty(), extension(asked).is_empty(), extension(file)) {
        (true, ..) => file.to_string(),
        (false, true, ext) if !ext.is_empty() => format!("{asked}.{ext}"),
        _ => asked.to_string(),
    }
}

pub struct File {
    pub name: String,
    pub declared: String,
    pub data: Vec<u8>,
}

pub struct Stored {
    pub url: String,
    pub thumbnail_url: Option<String>,
    pub filename: String,
    pub size: usize,
    pub kind: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

impl Stored {
    pub fn json(&self) -> Value {
        json!({
            "url": self.url, "thumbnailUrl": self.thumbnail_url, "filename": self.filename, "size": self.size,
            "type": self.kind, "width": self.width, "height": self.height,
        })
    }
}

/// Why an upload failed: a message for the uploader, or a fault of the server.
pub enum UploadError {
    Refused(String),
    Failed(anyhow::Error),
}

impl<E: Into<anyhow::Error>> From<E> for UploadError {
    fn from(err: E) -> Self {
        Self::Failed(err.into())
    }
}

/// A new file in the uploads folder, readable by the web server; never overwrites one.
pub async fn write_new(state: &AppState, filename: &str, data: &[u8]) -> anyhow::Result<()> {
    tokio::fs::create_dir_all(&state.config.uploads_dir).await?;
    let mut file = tokio::fs::OpenOptions::new().write(true).create_new(true).mode(0o644).open(state.config.uploads_dir.join(filename)).await?;
    file.write_all(data).await?;
    file.flush().await?;
    Ok(())
}

/// A thumbnail beside `filename`; it replaces an older one.
pub async fn save_thumbnail(state: &AppState, data: Arc<Vec<u8>>, filename: &str) -> anyhow::Result<String> {
    let thumb = blocking(move || images::thumbnail(&data)).await?;
    let name = images::thumbnail_name(filename);
    tokio::fs::write(state.config.uploads_dir.join(&name), thumb.data).await?;
    Ok(format!("/api/uploads/{name}"))
}

/// `storeOptimizedImage`: check, convert to WebP, store with a thumbnail.
pub async fn store(state: &AppState, file: File, asked_name: &str) -> Result<Stored, UploadError> {
    let detected = images::validate(&file.declared, &file.data).map_err(UploadError::Refused)?;
    let original = Arc::new(file.data);
    let input = original.clone();
    let (data, kind, size) = match blocking(move || images::process(&input)).await {
        Ok(done) => {
            let kind = if file.declared.split('/').nth(1) == Some("webp") { detected.clone() } else { "image/webp".to_string() };
            (Arc::new(done.data), kind, Some((done.width, done.height)))
        }
        Err(err) => {
            tracing::warn!(error = %err, "image processing failed; keeping the original");
            // Browsers other than Safari cannot show HEIC/HEIF: never store one unconverted.
            if detected == "image/heic" || detected == "image/heif" {
                return Err(UploadError::Refused("Could not convert this HEIC/HEIF photo. Try exporting it as JPEG.".into()));
            }
            (original, detected, None)
        }
    };
    let asked = preferred_name(asked_name, &file.name);
    let base = if kind == "image/webp" {
        let stem = stem(&asked);
        format!("{}.webp", if stem.is_empty() { "image" } else { stem })
    } else {
        asked
    };
    let filename = secure_filename(&base);
    write_new(state, &filename, &data).await?;
    let thumbnail_url = match save_thumbnail(state, data.clone(), &filename).await {
        Ok(url) => Some(url),
        Err(err) => {
            tracing::warn!(error = %err, "thumbnail failed; continuing without it");
            None
        }
    };
    Ok(Stored {
        url: format!("/api/uploads/{filename}"),
        thumbnail_url,
        filename,
        size: data.len(),
        kind,
        width: size.map(|s| s.0),
        height: size.map(|s| s.1),
    })
}

/// The `file` and `name` fields of the form; the first of each wins.
async fn read_form(parts: Parts, body: Body) -> Result<(Option<File>, String), UploadError> {
    let too_large = |status: StatusCode| (status == StatusCode::PAYLOAD_TOO_LARGE).then(|| UploadError::Refused(format!("File size must be between 1 byte and {}MB", images::MAX_FILE_SIZE / 1024 / 1024)));
    let mut form = Multipart::from_request(Request::from_parts(parts, body), &()).await.map_err(|e| anyhow::anyhow!(e.body_text()))?;
    let (mut file, mut name) = (None, None);
    loop {
        let field = match form.next_field().await {
            Ok(Some(field)) => field,
            Ok(None) => break,
            Err(e) => return Err(too_large(e.status()).unwrap_or_else(|| anyhow::anyhow!(e.body_text()).into())),
        };
        match field.name() {
            Some("file") if file.is_none() => {
                let Some(filename) = field.file_name().map(str::to_string) else { return Err(anyhow::anyhow!("file is not a file").into()) };
                let declared = field.content_type().unwrap_or("").to_string();
                let data = field.bytes().await.map_err(|e| too_large(e.status()).unwrap_or_else(|| anyhow::anyhow!(e.body_text()).into()))?;
                file = Some(File { name: filename, declared, data: data.into() });
            }
            Some("name") if name.is_none() && field.file_name().is_none() => name = field.text().await.ok(),
            _ => {}
        }
    }
    Ok((file, name.unwrap_or_default()))
}

const SLOW_DOWN: &str = "Rate limit exceeded. Please wait before uploading again.";
const MINUTE: Duration = Duration::from_secs(60);

/// `POST /api/upload`
pub async fn upload(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return json_status(StatusCode::UNAUTHORIZED, json!({ "success": false, "error": "Unauthorized", "message": "No authentication token provided" }));
    }
    let ip = limit::client_ip(&state, &parts);
    if !limit::check(&format!("upload:{ip}"), 60, MINUTE) {
        return failure(StatusCode::TOO_MANY_REQUESTS, SLOW_DOWN);
    }
    let result = async {
        let (file, name) = read_form(parts, body).await?;
        match file {
            Some(file) => store(&state, file, &name).await,
            None => Err(UploadError::Refused("No file uploaded".into())),
        }
    }
    .await;
    match result {
        Ok(stored) => {
            let mut reply = stored.json();
            reply["success"] = true.into();
            json_status(StatusCode::OK, reply)
        }
        Err(UploadError::Refused(message)) => failure(StatusCode::BAD_REQUEST, &message),
        // Internal details stay in the log.
        Err(UploadError::Failed(err)) => {
            tracing::error!(error = %err, "upload failed");
            failure(StatusCode::INTERNAL_SERVER_ERROR, "Upload failed. Please try again or contact support.")
        }
    }
}

/// `POST /api/admin/images/upload`: the admin, or the blog API token.
pub async fn upload_image(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    let admin = signed_in(&state, &parts.headers).await;
    if !admin && !write::bearer(&state, &parts.headers).await {
        return failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let who = if admin { "image:admin".to_string() } else { "image:bearer".to_string() };
    if !limit::check(&who, 60, MINUTE) {
        return failure(StatusCode::TOO_MANY_REQUESTS, SLOW_DOWN);
    }
    let result = async {
        let (file, name) = read_form(parts, body).await?;
        match file {
            Some(file) => store(&state, file, &name).await,
            None => Err(UploadError::Refused("No file uploaded".into())),
        }
    }
    .await;
    match result {
        Ok(stored) => json_status(StatusCode::OK, json!({ "success": true, "data": stored.json() })),
        Err(UploadError::Refused(message)) => failure(StatusCode::BAD_REQUEST, &message),
        Err(UploadError::Failed(err)) => {
            tracing::error!(error = %err, "upload failed");
            failure(StatusCode::BAD_REQUEST, "Upload failed")
        }
    }
}

fn content_type(filename: &str) -> &'static str {
    match filename.rsplit('.').next().unwrap_or("").to_ascii_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "pdf" => "application/pdf",
        _ => "application/octet-stream",
    }
}

/// `GET /api/uploads/{filename}`: streamed from disk.
pub async fn serve(State(state): State<AppState>, Path(filename): Path<String>, req: Request) -> Response {
    let (parts, _) = req.into_parts();
    if !limit::check(&format!("uploads:{}", limit::client_ip(&state, &parts)), 120, MINUTE) {
        return error(StatusCode::TOO_MANY_REQUESTS, "Rate limit exceeded");
    }
    if filename.is_empty() || filename.contains("..") || filename.contains(['/', '\\', '\0']) {
        return error(StatusCode::BAD_REQUEST, "Invalid filename");
    }
    let not_found = || error(StatusCode::NOT_FOUND, "File not found");
    let Ok(file) = tokio::fs::File::open(state.config.uploads_dir.join(&filename)).await else { return not_found() };
    let Ok(meta) = file.metadata().await else { return not_found() };
    if !meta.is_file() {
        return not_found();
    }
    (
        [
            (header::CONTENT_TYPE, content_type(&filename).to_string()),
            (header::CONTENT_LENGTH, meta.len().to_string()),
            (header::CACHE_CONTROL, "public, max-age=31536000, immutable".to_string()),
            (header::X_CONTENT_TYPE_OPTIONS, "nosniff".to_string()),
            (header::CONTENT_DISPOSITION, "inline".to_string()),
        ],
        Body::from_stream(ReaderStream::new(file)),
    )
        .into_response()
}

/// `GET /api/admin/icons`: the simple-icons titles and slugs, written by the web build.
pub async fn icons(State(state): State<AppState>, req: Request) -> Response {
    if !signed_in(&state, req.headers()).await {
        return failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    match tokio::fs::read(state.config.web_dir.join("icons.json")).await {
        Ok(list) => {
            let body = [br#"{"success":true,"icons":"#.as_slice(), &list, b"}"].concat();
            ([(header::CONTENT_TYPE, "application/json"), (header::CACHE_CONTROL, "private, max-age=86400")], body).into_response()
        }
        Err(err) => {
            tracing::error!(error = %err, "icon catalog missing");
            failure(StatusCode::INTERNAL_SERVER_ERROR, "FAILED_TO_LOAD_ICONS")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_are_made_safe() {
        assert_eq!(sanitize("../../etc/pass wd"), "passwd");
        for bad in ["", ".env", "///", "é"] {
            assert!(["upload", "file"].contains(&sanitize(bad).as_str()), "{bad}");
        }
        let name = secure_filename("My Photo.WEBP");
        assert!(name.ends_with(".webp") && !name.contains(' ') && name.split('-').count() == 3, "{name}");
        assert!(secure_filename("a.svg").ends_with(".bin"));
    }

    #[test]
    fn asked_names_keep_the_extension() {
        assert_eq!(preferred_name(" cover ", "a.png"), "cover.png");
        assert_eq!(preferred_name("cover.jpg", "a.png"), "cover.jpg");
        assert_eq!(preferred_name("  ", "a.png"), "a.png");
        assert_eq!(preferred_name("cover", "a"), "cover");
    }
}
