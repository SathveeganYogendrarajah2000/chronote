use tauri::State;

use crate::database::{index_dsm, index_general_note, remove_general_note};
use crate::state::AppState;
use crate::storage::models::{DsmDocument, GeneralNote, NoteMetadata};
use crate::storage::{delete_note, list_notes, read_dsm, read_note, save_dsm, save_note};

#[tauri::command]
pub fn read_dsm_document(state: State<AppState>) -> Result<DsmDocument, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;

    read_dsm(&ctx.root).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_dsm_document(doc: DsmDocument, state: State<AppState>) -> Result<(), String> {
    let mut lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_mut().ok_or_else(|| "No active workspace open".to_string())?;

    // 1. Atomic save to disk
    save_dsm(&ctx.root, &doc).map_err(|e| e.to_string())?;

    // 2. Incremental SQLite FTS5 index update
    index_dsm(&mut ctx.db, &doc).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn read_general_note(id: String, state: State<AppState>) -> Result<GeneralNote, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;

    read_note(&ctx.root, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_general_note(note: GeneralNote, state: State<AppState>) -> Result<(), String> {
    let mut lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_mut().ok_or_else(|| "No active workspace open".to_string())?;

    // 1. Atomic save to disk
    save_note(&ctx.root, &note).map_err(|e| e.to_string())?;

    // 2. Incremental SQLite FTS5 index update
    index_general_note(&mut ctx.db, &note).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn list_general_notes(state: State<AppState>) -> Result<Vec<NoteMetadata>, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;

    list_notes(&ctx.root).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_general_note(id: String, state: State<AppState>) -> Result<(), String> {
    let mut lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_mut().ok_or_else(|| "No active workspace open".to_string())?;

    // 1. Delete from disk
    delete_note(&ctx.root, &id).map_err(|e| e.to_string())?;

    // 2. Remove from SQLite index
    remove_general_note(&mut ctx.db, &id).map_err(|e| e.to_string())?;

    Ok(())
}
