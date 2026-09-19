use std::fs;
use std::path::PathBuf;
use tauri::State;
use chrono::Utc;

use crate::state::AppState;
use crate::storage::backup::create_workspace_backup;

#[tauri::command]
pub async fn pick_export_file_path(
    default_name: String,
    extension: String,
    filter_name: String,
) -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .set_file_name(&default_name)
        .add_filter(&filter_name, &[&extension])
        .save_file()
        .await;

    Ok(file.map(|h| h.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub fn save_exported_file(path: String, content: Vec<u8>) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if let Some(parent) = target.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }

    fs::write(&target, content)
        .map_err(|e| format!("Failed to write export file to {:?}: {}", target, e))?;

    Ok(())
}

#[tauri::command]
pub async fn export_workspace_backup(
    output_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let root = {
        let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
        let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;
        ctx.root.clone()
    };

    let target_path = match output_path {
        Some(p) if !p.trim().is_empty() => PathBuf::from(p),
        _ => {
            let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
            let default_name = format!("chronote-backup-{}.zip", timestamp);

            let dialog = rfd::AsyncFileDialog::new()
                .set_title("Save Chronote Workspace Backup (.zip)")
                .set_file_name(&default_name)
                .add_filter("Zip Archive (*.zip)", &["zip"])
                .save_file()
                .await;

            match dialog {
                Some(handle) => handle.path().to_path_buf(),
                None => return Err("Backup save was cancelled by user".to_string()),
            }
        }
    };

    let manifest = create_workspace_backup(&root, &target_path)
        .map_err(|e| format!("Failed to create workspace backup: {}", e))?;

    log::info!(
        "Workspace backup created at {:?} with {} notes and {} assets",
        target_path,
        manifest.general_notes_count,
        manifest.assets_count
    );

    Ok(target_path.to_string_lossy().to_string())
}
