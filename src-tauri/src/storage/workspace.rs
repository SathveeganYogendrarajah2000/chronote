use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

use chrono::Utc;
use uuid::Uuid;

use super::atomic::{atomic_write, cleanup_orphan_tmp_files};
use super::error::StorageError;
use super::models::{
    BinnedNoteRecord, CoursesDocument, DsmDocument, DsmEntry, GeneralNote, NoteMetadata, Workspace,
    WorkspaceSettings,
};

/// Validates that `subpath` remains within the bounds of `workspace_root`.
/// Defends against directory traversal attacks (SECURITY.md Section 3).
pub fn validate_workspace_path(
    workspace_root: &Path,
    subpath: &Path,
) -> Result<PathBuf, StorageError> {
    for comp in subpath.components() {
        match comp {
            std::path::Component::ParentDir => {
                return Err(StorageError::PathTraversal(format!(
                    "Path {:?} contains parent directory traversal ('..')",
                    subpath
                )));
            }
            std::path::Component::Prefix(_) | std::path::Component::RootDir => {
                return Err(StorageError::PathTraversal(format!(
                    "Path {:?} is an absolute or prefixed path",
                    subpath
                )));
            }
            _ => {}
        }
    }

    let target = workspace_root.join(subpath);
    if target.exists() {
        let canonical_root = workspace_root.canonicalize().map_err(StorageError::Io)?;
        let canonical_target = target.canonicalize().map_err(StorageError::Io)?;
        if !canonical_target.starts_with(&canonical_root) {
            return Err(StorageError::PathTraversal(format!(
                "Path {:?} resolves outside workspace root {:?}",
                subpath, workspace_root
            )));
        }
    }

    Ok(target)
}

/// Initializes a new Chronote workspace directory layout.
pub fn init_workspace(root: &Path, name: &str) -> Result<Workspace, StorageError> {
    if !root.exists() {
        fs::create_dir_all(root)?;
    }

    // 1. Create directory structure
    let notes_dir = root.join("notes");
    let assets_img_dir = root.join("assets").join("images");
    let assets_files_dir = root.join("assets").join("files");
    let cache_dir = root.join(".chronote");

    fs::create_dir_all(&notes_dir)?;
    fs::create_dir_all(&assets_img_dir)?;
    fs::create_dir_all(&assets_files_dir)?;
    fs::create_dir_all(&cache_dir)?;

    // 2. Auto-generate .gitignore and .stignore
    let gitignore_path = root.join(".gitignore");
    if !gitignore_path.exists() {
        fs::write(&gitignore_path, ".chronote/\n*.tmp.*\n")?;
    }

    let stignore_path = root.join(".stignore");
    if !stignore_path.exists() {
        fs::write(&stignore_path, ".chronote\n*.tmp.*\n")?;
    }

    // 3. Initialize workspace.json
    let workspace_json_path = root.join("workspace.json");
    let workspace = if workspace_json_path.exists() {
        open_workspace(root)?
    } else {
        let now = Utc::now().to_rfc3339();
        let wsp_id = format!("wsp_{}", Uuid::new_v4().simple());
        let new_wsp = Workspace {
            id: wsp_id,
            schema_version: 1,
            name: name.to_string(),
            path: root.to_string_lossy().to_string(),
            created_at: now.clone(),
            updated_at: now,
            settings: WorkspaceSettings::default(),
        };
        let bytes = serde_json::to_vec_pretty(&new_wsp)?;
        atomic_write(&workspace_json_path, &bytes)?;
        new_wsp
    };

    // 4. Initialize notes/dsm.json if missing
    let dsm_path = notes_dir.join("dsm.json");
    if !dsm_path.exists() {
        let now = Utc::now().to_rfc3339();
        let initial_dsm = DsmDocument {
            id: "dsm_master".to_string(),
            schema_version: 1,
            title: "Daily Stand-up Journal".to_string(),
            created_at: now.clone(),
            updated_at: now,
            entries: Vec::new(),
        };
        let bytes = serde_json::to_vec_pretty(&initial_dsm)?;
        atomic_write(&dsm_path, &bytes)?;
    }

    // 5. Initialize notes/courses.json if missing
    let courses_path = notes_dir.join("courses.json");
    if !courses_path.exists() {
        let now = Utc::now().to_rfc3339();
        let initial_courses = CoursesDocument {
            id: "courses_master".to_string(),
            schema_version: 1,
            title: "Courses & Topics".to_string(),
            created_at: now.clone(),
            updated_at: now,
            topics: Vec::new(),
            resources: Vec::new(),
        };
        let bytes = serde_json::to_vec_pretty(&initial_courses)?;
        atomic_write(&courses_path, &bytes)?;
    }

    // 6. Sweep orphan .tmp files
    let _ = cleanup_orphan_tmp_files(&notes_dir, Duration::from_secs(300));

    Ok(workspace)
}

/// Opens and validates an existing Chronote workspace directory.
pub fn open_workspace(root: &Path) -> Result<Workspace, StorageError> {
    if !root.exists() || !root.is_dir() {
        return Err(StorageError::InvalidWorkspace(format!(
            "Directory does not exist: {:?}",
            root
        )));
    }

    let workspace_json_path = root.join("workspace.json");
    if !workspace_json_path.exists() {
        return Err(StorageError::InvalidWorkspace(
            "Missing workspace.json in directory".to_string(),
        ));
    }

    let content = fs::read_to_string(&workspace_json_path)?;
    let mut workspace: Workspace = serde_json::from_str(&content)?;

    if workspace.schema_version != 1 {
        return Err(StorageError::Corrupted(format!(
            "Unsupported workspace schema version: {}",
            workspace.schema_version
        )));
    }

    // Ensure path matches current actual directory
    workspace.path = root.to_string_lossy().to_string();

    // Sweep abandoned .tmp files in notes directory
    let notes_dir = root.join("notes");
    if notes_dir.exists() {
        let _ = cleanup_orphan_tmp_files(&notes_dir, Duration::from_secs(300));
    }

    Ok(workspace)
}

/// Updates workspace settings in workspace.json.
pub fn save_workspace_settings(
    root: &Path,
    settings: &WorkspaceSettings,
) -> Result<Workspace, StorageError> {
    let mut workspace = open_workspace(root)?;
    workspace.settings = settings.clone();
    workspace.updated_at = Utc::now().to_rfc3339();

    let workspace_json_path = root.join("workspace.json");
    let bytes = serde_json::to_vec_pretty(&workspace)?;
    atomic_write(&workspace_json_path, &bytes)?;

    Ok(workspace)
}

/// Reads the continuous DSM journal master document.
pub fn read_dsm(root: &Path) -> Result<DsmDocument, StorageError> {
    let dsm_path = root.join("notes").join("dsm.json");
    if !dsm_path.exists() {
        return Err(StorageError::NotFound("notes/dsm.json not found".to_string()));
    }

    let content = fs::read_to_string(&dsm_path)?;
    let doc: DsmDocument = serde_json::from_str(&content)?;
    Ok(doc)
}

/// Atomically saves the continuous DSM journal master document.
pub fn save_dsm(root: &Path, doc: &DsmDocument) -> Result<(), StorageError> {
    let dsm_path = root.join("notes").join("dsm.json");
    let bytes = serde_json::to_vec_pretty(doc)?;
    atomic_write(&dsm_path, &bytes)?;
    Ok(())
}

/// Reads the continuous Courses & Topics master document.
pub fn read_courses(root: &Path) -> Result<CoursesDocument, StorageError> {
    let courses_path = root.join("notes").join("courses.json");
    if !courses_path.exists() {
        let now = Utc::now().to_rfc3339();
        return Ok(CoursesDocument {
            id: "courses_master".to_string(),
            schema_version: 1,
            title: "Courses & Topics".to_string(),
            created_at: now.clone(),
            updated_at: now,
            topics: Vec::new(),
            resources: Vec::new(),
        });
    }

    let content = fs::read_to_string(&courses_path)?;
    let doc: CoursesDocument = serde_json::from_str(&content)?;
    Ok(doc)
}

/// Atomically saves the continuous Courses & Topics master document.
pub fn save_courses(root: &Path, doc: &CoursesDocument) -> Result<(), StorageError> {
    let courses_path = root.join("notes").join("courses.json");
    let bytes = serde_json::to_vec_pretty(doc)?;
    atomic_write(&courses_path, &bytes)?;
    Ok(())
}

/// Reads a standalone General note from notes/{id}.json.
pub fn read_note(root: &Path, id: &str) -> Result<GeneralNote, StorageError> {
    if !id.starts_with("not_") {
        return Err(StorageError::InvalidWorkspace(format!(
            "Invalid note ID prefix: {id}"
        )));
    }

    let filename = format!("{id}.json");
    let note_path = root.join("notes").join(filename);
    if !note_path.exists() {
        return Err(StorageError::NotFound(format!("Note {id} not found")));
    }

    let content = fs::read_to_string(&note_path)?;
    let note: GeneralNote = serde_json::from_str(&content)?;
    Ok(note)
}

/// Atomically saves a standalone General note to notes/{id}.json.
pub fn save_note(root: &Path, note: &GeneralNote) -> Result<(), StorageError> {
    if !note.id.starts_with("not_") {
        return Err(StorageError::InvalidWorkspace(format!(
            "Invalid note ID prefix: {}",
            note.id
        )));
    }

    let filename = format!("{}.json", note.id);
    let note_path = root.join("notes").join(filename);
    let bytes = serde_json::to_vec_pretty(note)?;
    atomic_write(&note_path, &bytes)?;
    Ok(())
}

/// Lists all general notes by reading header metadata from disk notes/*.json.
pub fn list_notes(root: &Path) -> Result<Vec<NoteMetadata>, StorageError> {
    let notes_dir = root.join("notes");
    if !notes_dir.exists() {
        return Ok(Vec::new());
    }

    let mut notes = Vec::new();

    for entry in fs::read_dir(notes_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with("not_") && name.ends_with(".json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(note) = serde_json::from_str::<GeneralNote>(&content) {
                            notes.push(NoteMetadata {
                                id: note.id,
                                title: note.title,
                                tags: note.tags,
                                section: if note.section.trim().is_empty() {
                                    "General".to_string()
                                } else {
                                    note.section
                                },
                                pinned: note.pinned,
                                updated_at: note.updated_at,
                            });
                        }
                    }
                }
            }
        }
    }

    // Sort: pinned first, then updated_at descending
    notes.sort_by(|a, b| {
        b.pinned
            .cmp(&a.pinned)
            .then_with(|| b.updated_at.cmp(&a.updated_at))
    });

    Ok(notes)
}

/// Deletes a general note file from notes/{id}.json.
pub fn delete_note(root: &Path, id: &str) -> Result<(), StorageError> {
    if !id.starts_with("not_") {
        return Err(StorageError::InvalidWorkspace(format!(
            "Invalid note ID prefix: {id}"
        )));
    }

    let filename = format!("{id}.json");
    let note_path = root.join("notes").join(filename);
    if note_path.exists() {
        fs::remove_file(note_path)?;
    }
    Ok(())
}

/// Moves a note (general note or DSM entry) to bin/notes/{id}.json with 30-day retention metadata.
pub fn move_note_to_bin(root: &Path, id: &str) -> Result<BinnedNoteRecord, StorageError> {
    if !id.starts_with("not_") && !id.starts_with("ent_") {
        return Err(StorageError::InvalidWorkspace(format!(
            "Invalid note ID prefix: {id}"
        )));
    }

    let now = Utc::now();
    let expires = now + chrono::Duration::days(30);

    let (note, original_section, dsm_date) = if id.starts_with("ent_") {
        let mut dsm = read_dsm(root)?;
        let entry_idx = dsm.entries.iter().position(|e| e.id == id).ok_or_else(|| {
            StorageError::NotFound(format!("DSM entry not found: {id}"))
        })?;
        let entry = dsm.entries.remove(entry_idx);
        dsm.updated_at = now.to_rfc3339();
        save_dsm(root, &dsm)?;

        let general_note = GeneralNote {
            id: entry.id.clone(),
            schema_version: 1,
            title: format!("Daily Stand-up — {}", entry.date),
            tags: entry.tags.clone(),
            section: "General".to_string(),
            content: entry.content.clone(),
            pinned: false,
            created_at: entry.created_at.clone(),
            updated_at: entry.updated_at.clone(),
        };

        (general_note, "Daily Stand-up".to_string(), Some(entry.date))
    } else {
        let note = read_note(root, id)?;
        (note, "General Notes".to_string(), None)
    };

    let binned_record = BinnedNoteRecord {
        id: note.id.clone(),
        title: note.title.clone(),
        tags: note.tags.clone(),
        deleted_at: now.to_rfc3339(),
        expires_at: expires.to_rfc3339(),
        original_section,
        note,
        dsm_date,
    };

    let bin_notes_dir = root.join("bin").join("notes");
    if !bin_notes_dir.exists() {
        fs::create_dir_all(&bin_notes_dir)?;
    }

    let bin_file_path = bin_notes_dir.join(format!("{id}.json"));
    let json_bytes = serde_json::to_vec_pretty(&binned_record)?;
    atomic_write(&bin_file_path, &json_bytes)?;

    // Remove original from notes/ if it was a general note
    if id.starts_with("not_") {
        let original_path = root.join("notes").join(format!("{id}.json"));
        if original_path.exists() {
            fs::remove_file(original_path)?;
        }
    }

    Ok(binned_record)
}

/// Restores a note from bin/notes/{id}.json back to notes/{id}.json or notes/dsm.json.
pub fn restore_note_from_bin(root: &Path, id: &str) -> Result<GeneralNote, StorageError> {
    if !id.starts_with("not_") && !id.starts_with("ent_") {
        return Err(StorageError::InvalidWorkspace(format!(
            "Invalid note ID prefix: {id}"
        )));
    }

    let bin_file_path = root.join("bin").join("notes").join(format!("{id}.json"));
    if !bin_file_path.exists() {
        return Err(StorageError::NotFound(format!(
            "Binned note not found: {id}"
        )));
    }

    let content = fs::read_to_string(&bin_file_path)?;
    let record: BinnedNoteRecord = serde_json::from_str(&content)?;

    if id.starts_with("ent_") || record.original_section == "Daily Stand-up" || record.dsm_date.is_some() {
        let mut dsm = match read_dsm(root) {
            Ok(d) => d,
            Err(_) => {
                let now_str = Utc::now().to_rfc3339();
                DsmDocument {
                    id: "dsm_master".to_string(),
                    schema_version: 1,
                    title: "Daily Stand-up Journal".to_string(),
                    created_at: now_str.clone(),
                    updated_at: now_str,
                    entries: Vec::new(),
                }
            }
        };

        let date_str = record.dsm_date.clone().unwrap_or_else(|| {
            record
                .title
                .split('—')
                .last()
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string())
        });

        let restored_entry = DsmEntry {
            id: record.id.clone(),
            date: date_str,
            tags: record.note.tags.clone(),
            collapsed: false,
            content: record.note.content.clone(),
            created_at: record.note.created_at.clone(),
            updated_at: Utc::now().to_rfc3339(),
        };

        if let Some(pos) = dsm
            .entries
            .iter()
            .position(|e| e.id == restored_entry.id || e.date == restored_entry.date)
        {
            dsm.entries[pos] = restored_entry;
        } else {
            dsm.entries.push(restored_entry);
        }

        dsm.entries.sort_by(|a, b| b.date.cmp(&a.date));
        dsm.updated_at = Utc::now().to_rfc3339();
        save_dsm(root, &dsm)?;
    } else {
        save_note(root, &record.note)?;
    }

    // Remove from bin
    fs::remove_file(bin_file_path)?;

    Ok(record.note)
}

/// Lists all binned notes in bin/notes/, automatically purging any notes older than 30 days.
pub fn list_binned_notes(root: &Path) -> Result<Vec<BinnedNoteRecord>, StorageError> {
    let bin_notes_dir = root.join("bin").join("notes");
    if !bin_notes_dir.exists() {
        return Ok(Vec::new());
    }

    let now = Utc::now();
    let mut binned_notes = Vec::new();

    for entry in fs::read_dir(bin_notes_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("json") {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(record) = serde_json::from_str::<BinnedNoteRecord>(&content) {
                    // Check 30 days retention policy: auto-purge if expired
                    let is_expired = match chrono::DateTime::parse_from_rfc3339(&record.expires_at) {
                        Ok(expires_dt) => expires_dt < now,
                        Err(_) => match chrono::DateTime::parse_from_rfc3339(&record.deleted_at) {
                            Ok(deleted_dt) => (now - deleted_dt.with_timezone(&Utc)) > chrono::Duration::days(30),
                            Err(_) => false,
                        },
                    };

                    if is_expired {
                        let _ = fs::remove_file(&path);
                    } else {
                        binned_notes.push(record);
                    }
                }
            }
        }
    }

    // Sort by deleted_at descending (most recently deleted first)
    binned_notes.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));

    Ok(binned_notes)
}

/// Permanently removes a note from bin/notes/{id}.json.
pub fn delete_binned_note_permanently(root: &Path, id: &str) -> Result<(), StorageError> {
    if !id.starts_with("not_") && !id.starts_with("ent_") {
        return Err(StorageError::InvalidWorkspace(format!(
            "Invalid note ID prefix: {id}"
        )));
    }

    let bin_file_path = root.join("bin").join("notes").join(format!("{id}.json"));
    if bin_file_path.exists() {
        fs::remove_file(bin_file_path)?;
    }
    Ok(())
}

/// Permanently removes all notes from bin/notes/. Returns the count of deleted notes.
pub fn empty_bin(root: &Path) -> Result<usize, StorageError> {
    let bin_notes_dir = root.join("bin").join("notes");
    if !bin_notes_dir.exists() {
        return Ok(0);
    }

    let mut count = 0;
    for entry in fs::read_dir(&bin_notes_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("json") {
            if fs::remove_file(&path).is_ok() {
                count += 1;
            }
        }
    }

    Ok(count)
}

/// Saves cloud sync configuration atomically in .chronote/cloud_sync.json.
pub fn save_cloud_sync_config(root: &Path, config_json: &str) -> Result<(), StorageError> {
    let cache_dir = root.join(".chronote");
    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir)?;
    }
    let config_path = cache_dir.join("cloud_sync.json");
    atomic_write(&config_path, config_json.as_bytes())?;
    Ok(())
}

/// Reads cloud sync configuration from .chronote/cloud_sync.json if present.
pub fn read_cloud_sync_config(root: &Path) -> Result<Option<String>, StorageError> {
    let config_path = root.join(".chronote").join("cloud_sync.json");
    if !config_path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&config_path)?;
    Ok(Some(content))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_init_and_open_workspace() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();

        let wsp = init_workspace(root, "Test Workspace").expect("Init should succeed");
        assert_eq!(wsp.name, "Test Workspace");
        assert_eq!(wsp.schema_version, 1);

        // Verify layout
        assert!(root.join("notes").exists());
        assert!(root.join("assets").join("images").exists());
        assert!(root.join("assets").join("files").exists());
        assert!(root.join(".chronote").exists());
        assert!(root.join(".gitignore").exists());
        assert!(root.join(".stignore").exists());
        assert!(root.join("workspace.json").exists());
        assert!(root.join("notes").join("dsm.json").exists());

        // Test opening
        let opened = open_workspace(root).expect("Open should succeed");
        assert_eq!(opened.id, wsp.id);
        assert_eq!(opened.name, wsp.name);
    }

    #[test]
    fn test_save_and_read_dsm() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();
        init_workspace(root, "DSM Test").unwrap();

        let mut dsm = read_dsm(root).unwrap();
        assert_eq!(dsm.entries.len(), 0);

        dsm.title = "Updated DSM Journal".to_string();
        save_dsm(root, &dsm).unwrap();

        let reloaded = read_dsm(root).unwrap();
        assert_eq!(reloaded.title, "Updated DSM Journal");
    }

    #[test]
    fn test_save_and_list_general_notes() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();
        init_workspace(root, "Notes Test").unwrap();

        let note1 = GeneralNote {
            id: "not_01JC87XK89".to_string(),
            schema_version: 1,
            title: "Spring Security Guide".to_string(),
            tags: vec!["springboot".to_string(), "security".to_string()],
            section: "General".to_string(),
            content: serde_json::json!({ "type": "doc", "content": [] }),
            pinned: false,
            created_at: Utc::now().to_rfc3339(),
            updated_at: "2026-09-16T10:00:00Z".to_string(),
        };

        let note2 = GeneralNote {
            id: "not_01JC87XK90".to_string(),
            schema_version: 1,
            title: "Pinned Note".to_string(),
            tags: vec!["architecture".to_string()],
            section: "General".to_string(),
            content: serde_json::json!({ "type": "doc", "content": [] }),
            pinned: true,
            created_at: Utc::now().to_rfc3339(),
            updated_at: "2026-09-15T10:00:00Z".to_string(),
        };

        save_note(root, &note1).unwrap();
        save_note(root, &note2).unwrap();

        let notes = list_notes(root).unwrap();
        assert_eq!(notes.len(), 2);
        // note2 is pinned, so it should be first
        assert_eq!(notes[0].id, "not_01JC87XK90");
        assert!(notes[0].pinned);
        assert_eq!(notes[1].id, "not_01JC87XK89");

        // Read single note
        let read = read_note(root, "not_01JC87XK89").unwrap();
        assert_eq!(read.title, "Spring Security Guide");

        // Delete note
        delete_note(root, "not_01JC87XK89").unwrap();
        let remaining = list_notes(root).unwrap();
        assert_eq!(remaining.len(), 1);
    }

    #[test]
    fn test_path_traversal_defense() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();
        init_workspace(root, "Security Test").unwrap();

        let malicious = Path::new("../../etc/passwd");
        let result = validate_workspace_path(root, malicious);
        assert!(result.is_err());
    }

    #[test]
    fn test_save_and_read_courses() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();
        init_workspace(root, "Courses Test").unwrap();

        let doc = read_courses(root).unwrap();
        assert_eq!(doc.id, "courses_master");
        assert_eq!(doc.topics.len(), 0);

        let mut updated = doc.clone();
        updated.title = "Engineering Courses Tracker".to_string();
        save_courses(root, &updated).unwrap();

        let reloaded = read_courses(root).unwrap();
        assert_eq!(reloaded.title, "Engineering Courses Tracker");
    }

    #[test]
    fn test_bin_lifecycle() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();
        init_workspace(root, "Bin Test").unwrap();

        let note = GeneralNote {
            id: "not_01JC87XK99".to_string(),
            schema_version: 1,
            title: "Temporary Architecture Plan".to_string(),
            tags: vec!["arch".to_string()],
            section: "General".to_string(),
            content: serde_json::json!({ "type": "doc", "content": [] }),
            pinned: false,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };

        save_note(root, &note).unwrap();
        assert_eq!(list_notes(root).unwrap().len(), 1);

        // Move to bin
        let binned = move_note_to_bin(root, &note.id).unwrap();
        assert_eq!(binned.id, "not_01JC87XK99");
        assert_eq!(binned.original_section, "General Notes");

        // Should no longer be in notes/
        assert_eq!(list_notes(root).unwrap().len(), 0);

        // Should be in bin/
        let binned_list = list_binned_notes(root).unwrap();
        assert_eq!(binned_list.len(), 1);
        assert_eq!(binned_list[0].id, "not_01JC87XK99");

        // Restore note
        let restored = restore_note_from_bin(root, &note.id).unwrap();
        assert_eq!(restored.title, "Temporary Architecture Plan");

        // Should be back in notes/ and gone from bin/
        assert_eq!(list_notes(root).unwrap().len(), 1);
        assert_eq!(list_binned_notes(root).unwrap().len(), 0);
    }

    #[test]
    fn test_dsm_bin_lifecycle() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();
        init_workspace(root, "DSM Bin Test").unwrap();

        let now = Utc::now().to_rfc3339();
        let entry1 = DsmEntry {
            id: "ent_01JC87DAY1".to_string(),
            date: "2026-10-05".to_string(),
            tags: vec!["standup".to_string(), "backend".to_string()],
            collapsed: false,
            content: serde_json::json!({ "type": "doc", "content": [] }),
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        let entry2 = DsmEntry {
            id: "ent_01JC87DAY2".to_string(),
            date: "2026-10-04".to_string(),
            tags: vec!["standup".to_string()],
            collapsed: true,
            content: serde_json::json!({ "type": "doc", "content": [] }),
            created_at: now.clone(),
            updated_at: now.clone(),
        };

        let dsm_doc = DsmDocument {
            id: "dsm_master".to_string(),
            schema_version: 1,
            title: "Daily Stand-up Journal".to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
            entries: vec![entry1, entry2],
        };
        save_dsm(root, &dsm_doc).unwrap();

        // Check initial state
        let loaded = read_dsm(root).unwrap();
        assert_eq!(loaded.entries.len(), 2);

        // Move entry1 to bin
        let binned = move_note_to_bin(root, "ent_01JC87DAY1").unwrap();
        assert_eq!(binned.id, "ent_01JC87DAY1");
        assert_eq!(binned.original_section, "Daily Stand-up");
        assert_eq!(binned.dsm_date, Some("2026-10-05".to_string()));
        assert_eq!(binned.title, "Daily Stand-up — 2026-10-05");

        // DSM doc should now have only 1 entry
        let dsm_after_bin = read_dsm(root).unwrap();
        assert_eq!(dsm_after_bin.entries.len(), 1);
        assert_eq!(dsm_after_bin.entries[0].id, "ent_01JC87DAY2");

        // Bin should list the binned DSM entry
        let binned_items = list_binned_notes(root).unwrap();
        assert_eq!(binned_items.len(), 1);
        assert_eq!(binned_items[0].id, "ent_01JC87DAY1");

        // Restore entry1 from bin
        let restored = restore_note_from_bin(root, "ent_01JC87DAY1").unwrap();
        assert_eq!(restored.id, "ent_01JC87DAY1");

        // Bin should now be empty
        assert_eq!(list_binned_notes(root).unwrap().len(), 0);

        // DSM doc should have both entries back, sorted descending by date
        let dsm_restored = read_dsm(root).unwrap();
        assert_eq!(dsm_restored.entries.len(), 2);
        assert_eq!(dsm_restored.entries[0].date, "2026-10-05");
        assert_eq!(dsm_restored.entries[1].date, "2026-10-04");
    }

    #[test]
    fn test_bin_permanent_delete_and_empty() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();
        init_workspace(root, "Bin Delete Test").unwrap();

        let note1 = GeneralNote {
            id: "not_01JC87XK01".to_string(),
            schema_version: 1,
            title: "Note 1".to_string(),
            tags: vec![],
            section: "General".to_string(),
            content: serde_json::json!({ "type": "doc", "content": [] }),
            pinned: false,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };
        let note2 = GeneralNote {
            id: "not_01JC87XK02".to_string(),
            schema_version: 1,
            title: "Note 2".to_string(),
            tags: vec![],
            section: "General".to_string(),
            content: serde_json::json!({ "type": "doc", "content": [] }),
            pinned: false,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };

        save_note(root, &note1).unwrap();
        save_note(root, &note2).unwrap();

        move_note_to_bin(root, &note1.id).unwrap();
        move_note_to_bin(root, &note2.id).unwrap();

        assert_eq!(list_binned_notes(root).unwrap().len(), 2);

        // Permanently delete note1
        delete_binned_note_permanently(root, &note1.id).unwrap();
        assert_eq!(list_binned_notes(root).unwrap().len(), 1);

        // Empty bin removes note2
        let count = empty_bin(root).unwrap();
        assert_eq!(count, 1);
        assert_eq!(list_binned_notes(root).unwrap().len(), 0);
    }

    #[test]
    fn test_bin_auto_purge_expired() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();
        init_workspace(root, "Purge Test").unwrap();

        let bin_notes_dir = root.join("bin").join("notes");
        fs::create_dir_all(&bin_notes_dir).unwrap();

        // Write an already-expired binned record (e.g. 35 days ago)
        let past_time = Utc::now() - chrono::Duration::days(35);
        let expired_record = BinnedNoteRecord {
            id: "not_01JC87OLD0".to_string(),
            title: "Ancient Note".to_string(),
            tags: vec![],
            deleted_at: past_time.to_rfc3339(),
            expires_at: (past_time + chrono::Duration::days(30)).to_rfc3339(),
            original_section: "notes".to_string(),
            note: GeneralNote {
                id: "not_01JC87OLD0".to_string(),
                schema_version: 1,
                title: "Ancient Note".to_string(),
                tags: vec![],
                section: "General".to_string(),
                content: serde_json::json!({ "type": "doc", "content": [] }),
                pinned: false,
                created_at: past_time.to_rfc3339(),
                updated_at: past_time.to_rfc3339(),
            },
            dsm_date: None,
        };

        let file_path = bin_notes_dir.join("not_01JC87OLD0.json");
        let bytes = serde_json::to_vec_pretty(&expired_record).unwrap();
        fs::write(&file_path, bytes).unwrap();

        // Listing binned notes should automatically purge the expired file
        let list = list_binned_notes(root).unwrap();
        assert_eq!(list.len(), 0);
        assert!(!file_path.exists());
    }
}
