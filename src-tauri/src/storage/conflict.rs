use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use rusqlite::Connection;

use crate::storage::error::StorageError;
use crate::storage::models::{GeneralNote, DsmDocument, CoursesDocument};
use crate::storage::atomic::atomic_write;
use crate::database::{index_general_note, index_dsm};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConflictInfo {
    pub conflict_file_path: String,
    pub conflict_file_name: String,
    pub original_file_name: String,
    pub target_id: String,
    pub document_type: String,
    pub title: String,
    pub sync_source: String,
    pub conflict_detected_at: String,
    pub local_updated_at: Option<String>,
    pub conflicted_updated_at: Option<String>,
    pub preview_text: String,
}

/// Identifies if a filename matches known third-party file sync conflict patterns.
/// (ADR-005 Section: Conflict Prevention & Detection Strategy)
pub fn detect_conflict_pattern(file_name: &str) -> Option<(&'static str, String)> {
    let lower = file_name.to_lowercase();

    // 1. Dropbox: "not_xxx (Conflicted Copy 2026-09-19).json"
    if lower.contains("conflicted copy") && lower.ends_with(".json") {
        if let Some(pos) = lower.find(" (conflicted copy") {
            return Some(("Dropbox", format!("{}.json", &file_name[..pos])));
        }
    }

    // 2. Syncthing: "not_xxx.sync-conflict-20260919-123456-ABCDEF.json"
    if lower.contains(".sync-conflict-") && lower.ends_with(".json") {
        if let Some(pos) = lower.find(".sync-conflict-") {
            return Some(("Syncthing", format!("{}.json", &file_name[..pos])));
        }
    }

    // 3. OneDrive: "not_xxx-conflict-20260919.json" or "not_xxx - copy.json"
    if lower.contains("-conflict-") && lower.ends_with(".json") {
        if let Some(pos) = lower.find("-conflict-") {
            return Some(("OneDrive", format!("{}.json", &file_name[..pos])));
        }
    }
    if lower.contains(" - copy") && lower.ends_with(".json") {
        if let Some(pos) = lower.find(" - copy") {
            return Some(("OneDrive", format!("{}.json", &file_name[..pos])));
        }
    }

    // 4. Google Drive: "not_xxx (1).json"
    if lower.contains(" (1).json") || lower.contains(" (2).json") {
        if let Some(pos) = lower.find(" (") {
            return Some(("Google Drive", format!("{}.json", &file_name[..pos])));
        }
    }

    // 5. Git / Generic: "not_xxx.conflict.json" or ".orig"
    if lower.contains(".conflict.json") {
        if let Some(pos) = lower.find(".conflict.json") {
            return Some(("Generic", format!("{}.json", &file_name[..pos])));
        }
    }
    if lower.ends_with(".json.orig") {
        let orig = &file_name[..file_name.len() - 5];
        return Some(("Git", orig.to_string()));
    }

    None
}

/// Scans the workspace `notes/` directory for any sync conflict files.
pub fn scan_sync_conflicts(workspace_root: &Path) -> Result<Vec<SyncConflictInfo>, StorageError> {
    let notes_dir = workspace_root.join("notes");
    if !notes_dir.exists() {
        return Ok(Vec::new());
    }

    let mut conflicts = Vec::new();

    for entry in std::fs::read_dir(&notes_dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let file_name = entry.file_name().to_string_lossy().to_string();
        if let Some((sync_source, original_name)) = detect_conflict_pattern(&file_name) {
            let original_path = notes_dir.join(&original_name);
            let mut title = "Conflicted Note".to_string();
            let mut preview_text = String::new();
            let mut conflicted_updated_at = None;
            let mut target_id = original_name.trim_end_matches(".json").to_string();
            let mut doc_type = "general".to_string();

            if original_name == "dsm.json" {
                doc_type = "dsm".to_string();
                title = "Daily Stand-up Journal".to_string();
            }

            // Read conflicted file content to extract title and preview
            if let Ok(content_str) = std::fs::read_to_string(&path) {
                if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&content_str) {
                    if let Some(t) = json_val.get("title").and_then(|v| v.as_str()) {
                        title = t.to_string();
                    }
                    if let Some(u) = json_val.get("updatedAt").and_then(|v| v.as_str()) {
                        conflicted_updated_at = Some(u.to_string());
                    }
                    if let Some(id) = json_val.get("id").and_then(|v| v.as_str()) {
                        target_id = id.to_string();
                    }
                    // Extract text snippet
                    preview_text = json_val
                        .get("content")
                        .map(|c| c.to_string())
                        .unwrap_or_default();
                    if preview_text.len() > 180 {
                        preview_text = preview_text[..180].to_string();
                    }
                }
            }

            // Read local note updatedAt
            let mut local_updated_at = None;
            if original_path.exists() {
                if let Ok(orig_str) = std::fs::read_to_string(&original_path) {
                    if let Ok(orig_val) = serde_json::from_str::<serde_json::Value>(&orig_str) {
                        if let Some(u) = orig_val.get("updatedAt").and_then(|v| v.as_str()) {
                            local_updated_at = Some(u.to_string());
                        }
                    }
                }
            }

            let conflict_detected_at = std::fs::metadata(&path)
                .and_then(|m| m.modified())
                .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339())
                .unwrap_or_else(|_| chrono::Utc::now().to_rfc3339());

            conflicts.push(SyncConflictInfo {
                conflict_file_path: path.to_string_lossy().to_string(),
                conflict_file_name: file_name,
                original_file_name: original_name,
                target_id,
                document_type: doc_type,
                title,
                sync_source: sync_source.to_string(),
                conflict_detected_at,
                local_updated_at,
                conflicted_updated_at,
                preview_text,
            });
        }
    }

    Ok(conflicts)
}

/// Resolves a sync conflict according to the user's explicit choice:
/// - "keep_local": deletes the conflict file.
/// - "use_conflicted": overwrites local file with conflicted copy, re-indexes SQLite.
/// - "keep_both": saves conflicted copy as a new note with unique ID, indexes it, deletes conflict file.
pub fn resolve_sync_conflict(
    workspace_root: &Path,
    conn: &mut Connection,
    conflict_path_str: &str,
    resolution: &str,
) -> Result<(), StorageError> {
    let conflict_path = PathBuf::from(conflict_path_str);
    if !conflict_path.exists() {
        return Ok(());
    }

    let notes_dir = workspace_root.join("notes");

    match resolution {
        "keep_local" => {
            // Discard the external conflict file
            std::fs::remove_file(&conflict_path)?;
        }
        "use_conflicted" => {
            // Read conflict file
            let content_str = std::fs::read_to_string(&conflict_path)?;
            if let Ok(note) = serde_json::from_str::<GeneralNote>(&content_str) {
                let target_path = notes_dir.join(format!("{}.json", note.id));
                std::fs::write(&target_path, &content_str)?;
                index_general_note(conn, &note)?;
            }
            std::fs::remove_file(&conflict_path)?;
        }
        "keep_both" => {
            // Re-identify note with new unique ID so both are preserved
            let content_str = std::fs::read_to_string(&conflict_path)?;
            if let Ok(mut note) = serde_json::from_str::<GeneralNote>(&content_str) {
                let new_id = format!("not_conflict_{}", uuid::Uuid::new_v4().simple());
                note.id = new_id.clone();
                note.title = format!("[Conflict Copy] {}", note.title);
                note.updated_at = chrono::Utc::now().to_rfc3339();

                let new_file_path = notes_dir.join(format!("{}.json", new_id));
                std::fs::write(&new_file_path, serde_json::to_string_pretty(&note).unwrap())?;
                index_general_note(conn, &note)?;
            }
            std::fs::remove_file(&conflict_path)?;
        }
        _ => {
            return Err(StorageError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("Unknown conflict resolution strategy: {}", resolution),
            )));
        }
    }

    Ok(())
}

/// Resolves a 3-way conflict by atomically writing the merged document into the
/// authoritative note location, re-indexing in SQLite, and deleting the conflict file.
pub fn resolve_3way_conflict(
    workspace_root: &Path,
    conn: &mut Connection,
    conflict_path_str: &str,
    target_id: &str,
    document_type: &str,
    merged_data_json: &str,
) -> Result<(), StorageError> {
    let notes_dir = workspace_root.join("notes");

    match document_type {
        "dsm" => {
            let doc: DsmDocument = serde_json::from_str(merged_data_json)?;
            let target_path = notes_dir.join("dsm.json");
            let bytes = serde_json::to_vec_pretty(&doc)?;
            atomic_write(&target_path, &bytes)?;
            index_dsm(conn, &doc)?;
        }
        "courses" => {
            let doc: CoursesDocument = serde_json::from_str(merged_data_json)?;
            let target_path = notes_dir.join("courses.json");
            let bytes = serde_json::to_vec_pretty(&doc)?;
            atomic_write(&target_path, &bytes)?;
        }
        _ => {
            let note: GeneralNote = serde_json::from_str(merged_data_json)?;
            let file_name = if target_id.ends_with(".json") {
                target_id.to_string()
            } else {
                format!("{}.json", target_id)
            };
            let target_path = notes_dir.join(file_name);
            let bytes = serde_json::to_vec_pretty(&note)?;
            atomic_write(&target_path, &bytes)?;
            index_general_note(conn, &note)?;
        }
    }

    let conflict_path = PathBuf::from(conflict_path_str);
    if conflict_path.exists() {
        let _ = std::fs::remove_file(&conflict_path);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_detect_conflict_patterns() {
        assert_eq!(
            detect_conflict_pattern("not_01ABC (Conflicted Copy 2026-09-19).json"),
            Some(("Dropbox", "not_01ABC.json".to_string()))
        );
        assert_eq!(
            detect_conflict_pattern("not_01ABC.sync-conflict-20260919-123456-ABCDEF.json"),
            Some(("Syncthing", "not_01ABC.json".to_string()))
        );
        assert_eq!(
            detect_conflict_pattern("not_01ABC-conflict-20260919.json"),
            Some(("OneDrive", "not_01ABC.json".to_string()))
        );
        assert_eq!(
            detect_conflict_pattern("not_01ABC (1).json"),
            Some(("Google Drive", "not_01ABC.json".to_string()))
        );
        assert_eq!(
            detect_conflict_pattern("not_01ABC.json"),
            None
        );
    }

    #[test]
    fn test_scan_and_resolve_sync_conflict() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();
        let notes_dir = ws_root.join("notes");
        std::fs::create_dir_all(&notes_dir).unwrap();

        let mut conn = crate::database::open_or_create_index_db(ws_root).unwrap();

        // Write normal note
        let note = GeneralNote {
            id: "not_orig".to_string(),
            schema_version: 1,
            title: "Original Note".to_string(),
            tags: vec!["sync".to_string()],
            content: serde_json::json!({"type": "doc", "content": []}),
            pinned: false,
            created_at: "2026-09-19T10:00:00Z".to_string(),
            updated_at: "2026-09-19T10:00:00Z".to_string(),
        };
        std::fs::write(notes_dir.join("not_orig.json"), serde_json::to_string(&note).unwrap()).unwrap();
        index_general_note(&mut conn, &note).unwrap();

        // Write conflict note
        let conflict_note = GeneralNote {
            id: "not_orig".to_string(),
            schema_version: 1,
            title: "Conflicted Remote Edit".to_string(),
            tags: vec!["sync".to_string()],
            content: serde_json::json!({"type": "doc", "content": []}),
            pinned: false,
            created_at: "2026-09-19T10:00:00Z".to_string(),
            updated_at: "2026-09-19T10:30:00Z".to_string(),
        };
        let conflict_path = notes_dir.join("not_orig (Conflicted Copy 2026-09-19).json");
        std::fs::write(&conflict_path, serde_json::to_string(&conflict_note).unwrap()).unwrap();

        // 1. Scan
        let conflicts = scan_sync_conflicts(ws_root).unwrap();
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].sync_source, "Dropbox");
        assert_eq!(conflicts[0].title, "Conflicted Remote Edit");

        // 2. Resolve with "keep_both"
        resolve_sync_conflict(ws_root, &mut conn, &conflict_path.to_string_lossy(), "keep_both").unwrap();

        // Verify conflict file was removed
        assert!(!conflict_path.exists());

        // Verify original is still intact
        assert!(notes_dir.join("not_orig.json").exists());

        // Verify rescanning shows 0 conflicts
        let rescan = scan_sync_conflicts(ws_root).unwrap();
        assert_eq!(rescan.len(), 0);
    }

    #[test]
    fn test_resolve_3way_conflict() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();
        let notes_dir = ws_root.join("notes");
        std::fs::create_dir_all(&notes_dir).unwrap();

        let mut conn = crate::database::open_or_create_index_db(ws_root).unwrap();

        let conflict_path = notes_dir.join("not_demo (1).json");
        std::fs::write(&conflict_path, "{}").unwrap();

        let merged_note = GeneralNote {
            id: "not_demo".to_string(),
            schema_version: 1,
            title: "3-Way Merged Note".to_string(),
            tags: vec!["merged".to_string()],
            content: serde_json::json!({"type": "doc", "content": [{"type": "paragraph"}]}),
            pinned: false,
            created_at: "2026-10-06T10:00:00Z".to_string(),
            updated_at: "2026-10-06T12:00:00Z".to_string(),
        };
        let merged_json = serde_json::to_string(&merged_note).unwrap();

        resolve_3way_conflict(
            ws_root,
            &mut conn,
            &conflict_path.to_string_lossy(),
            "not_demo",
            "general",
            &merged_json,
        ).unwrap();

        assert!(!conflict_path.exists());
        let saved_path = notes_dir.join("not_demo.json");
        assert!(saved_path.exists());
        let saved_str = std::fs::read_to_string(&saved_path).unwrap();
        let saved: GeneralNote = serde_json::from_str(&saved_str).unwrap();
        assert_eq!(saved.title, "3-Way Merged Note");
        assert_eq!(saved.tags, vec!["merged"]);
    }
}
