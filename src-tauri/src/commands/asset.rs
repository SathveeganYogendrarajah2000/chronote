use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetInfo {
    pub id: String,
    pub file_name: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub mime_type: String,
    pub file_size: u64,
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

fn guess_mime(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "pdf" => "application/pdf",
        "json" => "application/json",
        "zip" => "application/zip",
        "txt" => "text/plain",
        "md" => "text/markdown",
        "csv" => "text/csv",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
pub async fn pick_asset_file(
    state: State<'_, AppState>,
    asset_type: String,
) -> Result<Option<AssetInfo>, String> {
    let root = {
        let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
        let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;
        ctx.root.clone()
    };

    let is_image = asset_type == "image";
    let mut dialog = rfd::AsyncFileDialog::new();

    if is_image {
        dialog = dialog
            .set_title("Select Image to Insert")
            .add_filter("Images (*.png, *.jpg, *.jpeg, *.gif, *.webp, *.svg)", &["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"]);
    } else {
        dialog = dialog
            .set_title("Select File to Attach");
    }

    let file_handle = dialog.pick_file().await;
    let handle = match file_handle {
        Some(h) => h,
        None => return Ok(None),
    };

    let source_path = handle.path();
    let original_name = source_path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "file.bin".to_string());

    let ext = source_path
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();

    let clean_name = sanitize_filename(&original_name);
    let id_prefix = if is_image { "img" } else { "att" };
    let asset_id = format!("{}_{}", id_prefix, Uuid::new_v4().simple());
    let saved_filename = format!("{}_{}", asset_id, clean_name);

    let sub_folder = if is_image { "images" } else { "files" };
    let target_dir = root.join("assets").join(sub_folder);
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Failed to create asset directory: {}", e))?;
    }

    let target_path = target_dir.join(&saved_filename);
    fs::copy(source_path, &target_path)
        .map_err(|e| format!("Failed to copy asset file: {}", e))?;

    let file_size = fs::metadata(&target_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let relative_path = format!("assets/{}/{}", sub_folder, saved_filename);
    let mime_type = guess_mime(&ext).to_string();

    Ok(Some(AssetInfo {
        id: asset_id,
        file_name: original_name,
        relative_path,
        absolute_path: target_path.to_string_lossy().to_string(),
        mime_type,
        file_size,
    }))
}

#[tauri::command]
pub fn save_asset_binary(
    state: State<'_, AppState>,
    asset_type: String,
    file_name: String,
    data: Vec<u8>,
) -> Result<AssetInfo, String> {
    let root = {
        let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
        let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;
        ctx.root.clone()
    };

    let is_image = asset_type == "image";
    let sub_folder = if is_image { "images" } else { "files" };
    let target_dir = root.join("assets").join(sub_folder);
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Failed to create asset directory: {}", e))?;
    }

    let clean_name = sanitize_filename(&file_name);
    let id_prefix = if is_image { "img" } else { "att" };
    let asset_id = format!("{}_{}", id_prefix, Uuid::new_v4().simple());
    let saved_filename = format!("{}_{}", asset_id, clean_name);
    let target_path = target_dir.join(&saved_filename);

    fs::write(&target_path, &data)
        .map_err(|e| format!("Failed to write asset file: {}", e))?;

    let ext = PathBuf::from(&file_name)
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();

    let relative_path = format!("assets/{}/{}", sub_folder, saved_filename);
    let mime_type = guess_mime(&ext).to_string();

    Ok(AssetInfo {
        id: asset_id,
        file_name,
        relative_path,
        absolute_path: target_path.to_string_lossy().to_string(),
        mime_type,
        file_size: data.len() as u64,
    })
}

#[tauri::command]
pub fn get_asset_path(
    state: State<'_, AppState>,
    asset_path_or_id: String,
) -> Result<String, String> {
    let root = {
        let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
        let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;
        ctx.root.clone()
    };

    let p = PathBuf::from(&asset_path_or_id);
    let resolved = if p.is_absolute() {
        p
    } else {
        root.join(asset_path_or_id)
    };

    if resolved.exists() {
        Ok(resolved.to_string_lossy().to_string())
    } else {
        Err("Asset file not found".to_string())
    }
}
