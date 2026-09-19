use tauri::State;

use crate::state::AppState;
use crate::storage::conflict::{scan_sync_conflicts, resolve_sync_conflict, SyncConflictInfo};

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
