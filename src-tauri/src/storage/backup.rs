use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::CompressionMethod;
use zip::ZipWriter;

use super::error::StorageError;
use super::models::{DsmDocument, Workspace};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BackupManifest {
    pub manifest_version: u32,
    pub chronote_version: String,
    pub backup_timestamp: String,
    pub workspace_id: String,
    pub workspace_name: String,
    pub dsm_entry_count: usize,
    pub general_notes_count: usize,
    pub assets_count: usize,
}

/// Creates a complete, lossless backup archive (.zip) of the workspace.
/// Strictly excludes `.chronote/` disposable index cache, temporary files, and `.git/`.
/// (EXPORT_SPEC.md Section 6 and ADR-007).
pub fn create_workspace_backup(
    workspace_root: &Path,
    output_zip_path: &Path,
) -> Result<BackupManifest, StorageError> {
    if !workspace_root.exists() {
        return Err(StorageError::InvalidWorkspace(format!(
            "Workspace root {:?} does not exist",
            workspace_root
        )));
    }

    // 1. Read workspace.json to extract identity
    let workspace_json_path = workspace_root.join("workspace.json");
    let (workspace_id, workspace_name) = if workspace_json_path.exists() {
        let content = fs::read_to_string(&workspace_json_path)?;
        let wsp: Workspace = serde_json::from_str(&content)?;
        (wsp.id, wsp.name)
    } else {
        ("wsp_unknown".to_string(), "Untitled Workspace".to_string())
    };

    // 2. Count DSM entries
    let dsm_path = workspace_root.join("notes").join("dsm.json");
    let dsm_entry_count = if dsm_path.exists() {
        let content = fs::read_to_string(&dsm_path)?;
        let doc: Result<DsmDocument, _> = serde_json::from_str(&content);
        doc.map(|d| d.entries.len()).unwrap_or(0)
    } else {
        0
    };

    // 3. Count general notes
    let notes_dir = workspace_root.join("notes");
    let mut general_notes_count = 0;
    if notes_dir.exists() {
        if let Ok(entries) = fs::read_dir(&notes_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("not_") && name.ends_with(".json") {
                    general_notes_count += 1;
                }
            }
        }
    }

    // 4. Count assets
    let mut assets_count = 0;
    let assets_dir = workspace_root.join("assets");
    if assets_dir.exists() {
        for entry in WalkDir::new(&assets_dir).into_iter().flatten() {
            if entry.file_type().is_file() {
                assets_count += 1;
            }
        }
    }

    // 5. Construct manifest
    let manifest = BackupManifest {
        manifest_version: 1,
        chronote_version: env!("CARGO_PKG_VERSION").to_string(),
        backup_timestamp: Utc::now().to_rfc3339(),
        workspace_id,
        workspace_name,
        dsm_entry_count,
        general_notes_count,
        assets_count,
    };

    // 6. Ensure parent directory for output zip exists
    if let Some(parent) = output_zip_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    // 7. Write zip file
    let file = File::create(output_zip_path)?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated);

    // 7.1 Write manifest.json
    let manifest_bytes = serde_json::to_vec_pretty(&manifest)?;
    zip.start_file("manifest.json", options)
        .map_err(|e| StorageError::Zip(format!("Zip manifest error: {}", e)))?;
    zip.write_all(&manifest_bytes)?;

    // 7.2 Walk and pack workspace files
    for entry in WalkDir::new(workspace_root).into_iter().flatten() {
        let path = entry.path();
        if path == workspace_root {
            continue;
        }

        // Relative path inside zip
        let rel_path = match path.strip_prefix(workspace_root) {
            Ok(p) => p,
            Err(_) => continue,
        };

        let rel_str = rel_path.to_string_lossy().replace('\\', "/");

        // EXCLUSIONS:
        // - .chronote/ (disposable SQLite index cache)
        // - .git/
        // - temporary files (.tmp, *.tmp.*)
        if rel_str.starts_with(".chronote")
            || rel_str.starts_with(".git")
            || rel_str.contains(".tmp")
        {
            continue;
        }

        if entry.file_type().is_dir() {
            let dir_name = if rel_str.ends_with('/') {
                rel_str
            } else {
                format!("{}/", rel_str)
            };
            let _ = zip.add_directory(dir_name, options);
        } else if entry.file_type().is_file() {
            zip.start_file(&rel_str, options)
                .map_err(|e| StorageError::Zip(format!("Zip file error {}: {}", rel_str, e)))?;
            let mut f = File::open(path)?;
            let mut buffer = Vec::new();
            f.read_to_end(&mut buffer)?;
            zip.write_all(&buffer)?;
        }
    }

    zip.finish()
        .map_err(|e| StorageError::Zip(format!("Zip finish error: {}", e)))?;

    Ok(manifest)
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::storage::init_workspace;
    use tempfile::tempdir;

    #[test]
    fn test_create_workspace_backup_creates_valid_zip() {
        let ws_dir = tempdir().expect("tempdir");
        let ws_path = ws_dir.path();
        let ws = init_workspace(ws_path, "Test Backup Workspace").expect("init");

        // Create a general note
        let note_path = ws_path.join("notes").join("not_test1.json");
        fs::write(&note_path, r#"{"id":"not_test1","title":"Hello Note","tags":["test"]}"#).unwrap();

        // Create an asset
        let img_path = ws_path.join("assets").join("images").join("img_1.png");
        fs::write(&img_path, b"fake_png_data").unwrap();

        // Create a disposable .chronote cache file that MUST be excluded
        let cache_file = ws_path.join(".chronote").join("index.db");
        fs::write(&cache_file, b"cache_sqlite_data").unwrap();

        // Create a temporary file that MUST be excluded
        let tmp_file = ws_path.join("notes").join("dsm.tmp.123");
        fs::write(&tmp_file, b"temporary_data").unwrap();

        let out_dir = tempdir().expect("out_dir");
        let zip_path = out_dir.path().join("chronote_backup.zip");

        let manifest = create_workspace_backup(ws_path, &zip_path).expect("backup success");
        assert_eq!(manifest.workspace_id, ws.id);
        assert_eq!(manifest.workspace_name, "Test Backup Workspace");
        assert_eq!(manifest.general_notes_count, 1);
        assert_eq!(manifest.assets_count, 1);

        assert!(zip_path.exists());
        let file = File::open(&zip_path).expect("open zip");
        let mut archive = zip::ZipArchive::new(file).expect("read zip archive");

        // Verify manifest.json exists inside zip
        {
            let mut manifest_file = archive.by_name("manifest.json").expect("manifest.json in zip");
            let mut manifest_content = String::new();
            manifest_file.read_to_string(&mut manifest_content).unwrap();
            assert!(manifest_content.contains("Test Backup Workspace"));
        }

        // Verify notes/not_test1.json exists
        assert!(archive.by_name("notes/not_test1.json").is_ok());

        // Verify assets/images/img_1.png exists
        assert!(archive.by_name("assets/images/img_1.png").is_ok());

        // Verify .chronote/index.db is strictly EXCLUDED
        assert!(archive.by_name(".chronote/index.db").is_err());

        // Verify notes/dsm.tmp.123 is strictly EXCLUDED
        assert!(archive.by_name("notes/dsm.tmp.123").is_err());
    }
}
