use tauri::State;

use crate::database::{index_dsm, index_general_note, remove_general_note};
use crate::state::AppState;
use crate::storage::models::{
    BinnedNoteRecord, CoursesDocument, DsmDocument, GeneralNote, NoteMetadata,
};
use crate::storage::{
    delete_binned_note_permanently as storage_delete_binned_note_permanently, delete_note,
    empty_bin as storage_empty_bin, list_binned_notes as storage_list_binned_notes, list_notes,
    move_note_to_bin as storage_move_to_bin, read_courses, read_dsm, read_note,
    restore_note_from_bin as storage_restore_from_bin, save_courses, save_dsm, save_note,
};

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
pub fn read_courses_document(state: State<AppState>) -> Result<CoursesDocument, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;

    read_courses(&ctx.root).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_courses_document(doc: CoursesDocument, state: State<AppState>) -> Result<(), String> {
    let mut lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_mut().ok_or_else(|| "No active workspace open".to_string())?;

    save_courses(&ctx.root, &doc).map_err(|e| e.to_string())
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

#[tauri::command]
pub fn move_note_to_bin(id: String, state: State<AppState>) -> Result<BinnedNoteRecord, String> {
    let mut lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_mut().ok_or_else(|| "No active workspace open".to_string())?;

    // 1. Move file to bin/notes/
    let binned = storage_move_to_bin(&ctx.root, &id).map_err(|e| e.to_string())?;

    // 2. Remove from active SQLite index
    if id.starts_with("ent_") {
        if let Ok(dsm) = crate::storage::read_dsm(&ctx.root) {
            let _ = index_dsm(&mut ctx.db, &dsm);
        }
    } else {
        remove_general_note(&mut ctx.db, &id).map_err(|e| e.to_string())?;
    }

    Ok(binned)
}

#[tauri::command]
pub fn restore_note_from_bin(id: String, state: State<AppState>) -> Result<GeneralNote, String> {
    let mut lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_mut().ok_or_else(|| "No active workspace open".to_string())?;

    // 1. Restore file from bin/notes/ to notes/
    let restored = storage_restore_from_bin(&ctx.root, &id).map_err(|e| e.to_string())?;

    // 2. Re-index into SQLite FTS5
    if id.starts_with("ent_") || restored.id.starts_with("ent_") {
        if let Ok(dsm) = crate::storage::read_dsm(&ctx.root) {
            let _ = index_dsm(&mut ctx.db, &dsm);
        }
    } else {
        index_general_note(&mut ctx.db, &restored).map_err(|e| e.to_string())?;
    }

    Ok(restored)
}

#[tauri::command]
pub fn list_binned_notes(state: State<AppState>) -> Result<Vec<BinnedNoteRecord>, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;

    storage_list_binned_notes(&ctx.root).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_binned_note_permanently(id: String, state: State<AppState>) -> Result<(), String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;

    storage_delete_binned_note_permanently(&ctx.root, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn empty_bin(state: State<AppState>) -> Result<usize, String> {
    let lock = state.context.lock().map_err(|_| "State lock poisoned".to_string())?;
    let ctx = lock.as_ref().ok_or_else(|| "No active workspace open".to_string())?;

    storage_empty_bin(&ctx.root).map_err(|e| e.to_string())
}
