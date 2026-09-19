use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use super::error::StorageError;

static WRITE_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Atomically persists `data` to `target_path`.
/// Protocol:
/// 1. Write to `{target_path}.tmp.{pid}_{timestamp}_{counter}`
/// 2. Flush OS dirty kernel buffers to physical media via `File::sync_all(&file)`
/// 3. Atomically rename the temporary file to `target_path`
pub fn atomic_write(target_path: &Path, data: &[u8]) -> Result<(), StorageError> {
    let parent_dir = target_path
        .parent()
        .ok_or_else(|| StorageError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Target path has no parent directory",
        )))?;

    if !parent_dir.exists() {
        fs::create_dir_all(parent_dir)?;
    }

    let pid = std::process::id();
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let counter = WRITE_COUNTER.fetch_add(1, Ordering::SeqCst);

    let file_name = target_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document");

    let temp_filename = format!("{file_name}.tmp.{pid}_{timestamp}_{counter}");
    let temp_path = parent_dir.join(temp_filename);

    // 1. Write data to temporary file
    {
        let mut file = File::create(&temp_path)?;
        file.write_all(data)?;
        // 2. Force physical disk synchronization
        file.sync_all()?;
    }

    // 3. Atomically rename temp file over target file
    if let Err(err) = fs::rename(&temp_path, target_path) {
        // Clean up temp file on failure so we don't leave debris
        let _ = fs::remove_file(&temp_path);
        return Err(StorageError::Io(err));
    }

    Ok(())
}

/// Sweeps the specified directory for abandoned `.tmp.*` files older than `older_than`.
/// Called on startup to clean up leftover files from power cuts or crashes.
pub fn cleanup_orphan_tmp_files(dir: &Path, older_than: Duration) -> Result<usize, StorageError> {
    if !dir.exists() || !dir.is_dir() {
        return Ok(0);
    }

    let mut removed_count = 0;
    let now = SystemTime::now();

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.contains(".tmp.") || name.ends_with(".tmp") {
                    if let Ok(metadata) = entry.metadata() {
                        let modified = metadata.modified().unwrap_or(now);
                        if let Ok(elapsed) = now.duration_since(modified) {
                            if elapsed >= older_than && fs::remove_file(&path).is_ok() {
                                removed_count += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(removed_count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_atomic_write_creates_file() {
        let temp_dir = tempdir().unwrap();
        let target_file = temp_dir.path().join("test_note.json");
        let sample_data = b"{\"message\": \"Hello Chronote\"}";

        atomic_write(&target_file, sample_data).expect("Atomic write should succeed");

        assert!(target_file.exists());
        let read_back = fs::read(&target_file).expect("File must be readable");
        assert_eq!(read_back, sample_data);

        // Verify no leftover .tmp files
        let entries: Vec<_> = fs::read_dir(temp_dir.path())
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().to_string())
            .collect();
        assert_eq!(entries, vec!["test_note.json"]);
    }

    #[test]
    fn test_atomic_write_overwrites_cleanly() {
        let temp_dir = tempdir().unwrap();
        let target_file = temp_dir.path().join("note_replace.json");

        atomic_write(&target_file, b"version 1").unwrap();
        assert_eq!(fs::read_to_string(&target_file).unwrap(), "version 1");

        atomic_write(&target_file, b"version 2 updated").unwrap();
        assert_eq!(fs::read_to_string(&target_file).unwrap(), "version 2 updated");
    }

    #[test]
    fn test_cleanup_orphan_tmp_files() {
        let temp_dir = tempdir().unwrap();
        let old_tmp = temp_dir.path().join("doc.json.tmp.123_456_789");
        let fresh_file = temp_dir.path().join("doc.json");

        fs::write(&old_tmp, b"debris").unwrap();
        fs::write(&fresh_file, b"valid note").unwrap();

        // Older than 0 duration cleans immediately
        let removed = cleanup_orphan_tmp_files(temp_dir.path(), Duration::from_secs(0)).unwrap();
        assert_eq!(removed, 1);
        assert!(!old_tmp.exists());
        assert!(fresh_file.exists());
    }
}
