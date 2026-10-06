use std::path::PathBuf;
use tauri::State;

use crate::database::{open_or_create_index_db, rebuild_index_from_disk};
use crate::state::{AppState, WorkspaceContext};
use crate::storage::models::{IndexStats, Workspace, WorkspaceSettings};
use crate::storage::{init_workspace, open_workspace as storage_open_workspace, save_workspace_settings as storage_save_settings};

#[tauri::command]
pub async fn pick_workspace_directory() -> Result<Option<String>, String> {
    let folder = rfd::AsyncFileDialog::new()
        .set_title("Select Chronote Workspace Directory")
        .pick_folder()
        .await;

    Ok(folder.map(|handle| handle.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub fn create_workspace(
    path: String,
    name: String,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let root = PathBuf::from(&path);
    let workspace = init_workspace(&root, &name).map_err(|e| e.to_string())?;

    let mut db = open_or_create_index_db(&root).map_err(|e| e.to_string())?;
    let _ = rebuild_index_from_disk(&mut db, &root).map_err(|e| e.to_string())?;

    let mut lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    *lock = Some(WorkspaceContext {
        root,
        workspace: workspace.clone(),
        db,
    });

    Ok(workspace)
}

#[tauri::command]
pub fn open_workspace(path: String, state: State<AppState>) -> Result<Workspace, String> {
    let root = PathBuf::from(&path);
    let workspace = storage_open_workspace(&root).map_err(|e| e.to_string())?;

    let mut db = open_or_create_index_db(&root).map_err(|e| e.to_string())?;
    let _ = rebuild_index_from_disk(&mut db, &root).map_err(|e| e.to_string())?;

    let mut lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    *lock = Some(WorkspaceContext {
        root,
        workspace: workspace.clone(),
        db,
    });

    Ok(workspace)
}

#[tauri::command]
pub fn get_active_workspace(state: State<AppState>) -> Result<Option<Workspace>, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    Ok(lock.as_ref().map(|ctx| ctx.workspace.clone()))
}

#[tauri::command]
pub fn save_workspace_settings(
    settings: WorkspaceSettings,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let mut lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_mut().ok_or_else(|| "No active workspace open".to_string())?;

    let updated = storage_save_settings(&ctx.root, &settings).map_err(|e| e.to_string())?;
    ctx.workspace = updated.clone();

    Ok(updated)
}

#[tauri::command]
pub fn rebuild_index(state: State<AppState>) -> Result<IndexStats, String> {
    let mut lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_mut().ok_or_else(|| "No active workspace open".to_string())?;

    let stats = rebuild_index_from_disk(&mut ctx.db, &ctx.root).map_err(|e| e.to_string())?;
    Ok(stats)
}

#[tauri::command]
pub fn save_cloud_sync_config(
    config_json: String,
    state: State<AppState>,
) -> Result<(), String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;
    crate::storage::save_cloud_sync_config(&ctx.root, &config_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_cloud_sync_config(
    state: State<AppState>,
) -> Result<Option<String>, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;
    crate::storage::read_cloud_sync_config(&ctx.root).map_err(|e| e.to_string())
}
