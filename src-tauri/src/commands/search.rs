use tauri::State;

use crate::search::{
    get_backlinks_for_note, get_resources_by_filter, search_fts, BacklinkReference,
    ResourceReference, SearchResultItem,
};
use crate::state::AppState;

#[tauri::command]
pub fn search_workspace(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<SearchResultItem>, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;
    search_fts(&ctx.db, &query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_resources(
    state: State<'_, AppState>,
    document_id: Option<String>,
    resource_type: Option<String>,
) -> Result<Vec<ResourceReference>, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;
    get_resources_by_filter(
        &ctx.db,
        document_id.as_deref(),
        resource_type.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_backlinks(
    state: State<'_, AppState>,
    target_note_id: String,
) -> Result<Vec<BacklinkReference>, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;
    get_backlinks_for_note(&ctx.db, &target_note_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_backlinks_graph(
    state: State<'_, AppState>,
) -> Result<crate::search::BacklinksGraphData, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;
    crate::search::get_backlinks_graph(&ctx.db).map_err(|e| e.to_string())
}
