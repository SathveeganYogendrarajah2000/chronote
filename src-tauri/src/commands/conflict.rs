use tauri::State;

use crate::state::AppState;
use crate::storage::conflict::{
    resolve_3way_conflict as storage_resolve_3way, resolve_sync_conflict, scan_sync_conflicts,
    SyncConflictInfo,
};

#[tauri::command]
pub fn get_sync_conflicts(state: State<AppState>) -> Result<Vec<SyncConflictInfo>, String> {
    let guard = state.context.lock().map_err(|e| e.to_string())?;
    match guard.as_ref() {
        Some(ctx) => scan_sync_conflicts(&ctx.root).map_err(|e| e.to_string()),
        None => Ok(Vec::new()),
    }
}

#[tauri::command]
pub fn resolve_conflict(
    conflict_file_path: String,
    resolution: String,
    state: State<AppState>,
) -> Result<(), String> {
    let mut guard = state.context.lock().map_err(|e| e.to_string())?;
    match guard.as_mut() {
        Some(ctx) => {
            resolve_sync_conflict(&ctx.root, &mut ctx.db, &conflict_file_path, &resolution)
                .map_err(|e| e.to_string())
        }
        None => Err("No active workspace".to_string()),
    }
}

#[tauri::command]
pub fn resolve_3way_conflict(
    conflict_file_path: String,
    target_id: String,
    document_type: String,
    merged_data_json: String,
    state: State<AppState>,
) -> Result<(), String> {
    let mut guard = state.context.lock().map_err(|e| e.to_string())?;
    match guard.as_mut() {
        Some(ctx) => storage_resolve_3way(
            &ctx.root,
            &mut ctx.db,
            &conflict_file_path,
            &target_id,
            &document_type,
            &merged_data_json,
        )
        .map_err(|e| e.to_string()),
        None => Err("No active workspace".to_string()),
    }
}
