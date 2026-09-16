use std::path::Path;
use rusqlite::{params, Connection};

use crate::storage::error::StorageError;
use crate::storage::models::{DsmDocument, GeneralNote, IndexStats};

/// Opens or creates the SQLite cache database at `.chronote/index.db`.
pub fn open_or_create_index_db(workspace_root: &Path) -> Result<Connection, StorageError> {
    let db_dir = workspace_root.join(".chronote");
    if !db_dir.exists() {
        std::fs::create_dir_all(&db_dir)?;
    }

    let db_path = db_dir.join("index.db");
    let mut conn = Connection::open(&db_path)?;

    // Configure high-performance SQLite PRAGMAs (STORAGE_FORMAT.md Section 4)
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA temp_store = MEMORY;
         PRAGMA cache_size = -64000;", // 64 MB cache
    )?;

    initialize_schema(&mut conn)?;

    Ok(conn)
}

/// Applies schema DDL and FTS5 virtual tables.
pub fn initialize_schema(conn: &mut Connection) -> Result<(), StorageError> {
    let tx = conn.transaction()?;

    tx.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,          -- 'dsm' or 'general'
            title TEXT NOT NULL,
            file_path TEXT NOT NULL,
            schema_version INTEGER NOT NULL,
            pinned INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS dsm_entries (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            entry_date TEXT NOT NULL,     -- YYYY-MM-DD
            collapsed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tags (
            tag TEXT NOT NULL,
            document_id TEXT NOT NULL,
            entry_id TEXT,               -- NULL for general notes; entry ID for DSM
            PRIMARY KEY(tag, document_id, entry_id)
        );

        CREATE TABLE IF NOT EXISTS backlinks (
            source_document_id TEXT NOT NULL,
            source_entry_id TEXT,
            target_note_id TEXT NOT NULL,
            PRIMARY KEY(source_document_id, source_entry_id, target_note_id)
        );

        CREATE TABLE IF NOT EXISTS resources (
            id TEXT PRIMARY KEY,
            resource_type TEXT NOT NULL,  -- 'code', 'image', 'link', 'attachment'
            parent_document_id TEXT NOT NULL,
            entry_id TEXT,
            block_id TEXT NOT NULL,
            title TEXT NOT NULL,
            language TEXT,
            target_url TEXT,
            asset_id TEXT
        );

        -- Virtual table for full-text search with unicode61 tokenizer
        CREATE VIRTUAL TABLE IF NOT EXISTS fts_blocks USING fts5(
            block_id UNINDEXED,
            document_id UNINDEXED,
            document_type UNINDEXED,
            entry_id UNINDEXED,
            entry_date,
            block_type,
            language,
            tags,
            content,
            tokenize = 'unicode61 remove_diacritics 2'
        );

        -- Virtual table for trigram code matching (SEARCH_SPEC.md 4.1)
        CREATE VIRTUAL TABLE IF NOT EXISTS fts_code_trigram USING fts5(
            block_id UNINDEXED,
            document_id UNINDEXED,
            language UNINDEXED,
            code_content,
            tokenize = 'trigram'
        );

        PRAGMA user_version = 1;
        ",
    )?;

    tx.commit()?;
    Ok(())
}

struct ExtractedBlock {
    block_id: String,
    block_type: String,
    language: Option<String>,
    content: String,
}

fn extract_blocks(node: &serde_json::Value) -> Vec<ExtractedBlock> {
    let mut blocks = Vec::new();
    if let Some(content_array) = node.get("content").and_then(|c| c.as_array()) {
        for (i, child) in content_array.iter().enumerate() {
            let block_type = child
                .get("type")
                .and_then(|t| t.as_str())
                .unwrap_or("paragraph")
                .to_string();

            let block_id = child
                .get("attrs")
                .and_then(|a| a.get("id"))
                .and_then(|id| id.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("blk_gen_{i}"));

            let language = child
                .get("attrs")
                .and_then(|a| a.get("language"))
                .and_then(|l| l.as_str())
                .map(|s| s.to_string());

            let mut text = String::new();
            extract_text_recursive(child, &mut text);

            blocks.push(ExtractedBlock {
                block_id,
                block_type,
                language,
                content: text.trim().to_string(),
            });
        }
    }
    blocks
}

fn extract_text_recursive(node: &serde_json::Value, buffer: &mut String) {
    if let Some(text) = node.get("text").and_then(|t| t.as_str()) {
        buffer.push_str(text);
        buffer.push(' ');
    }
    if let Some(children) = node.get("content").and_then(|c| c.as_array()) {
        for child in children {
            extract_text_recursive(child, buffer);
        }
    }
}

/// Indexes or updates the DSM document in SQLite.
pub fn index_dsm(conn: &mut Connection, doc: &DsmDocument) -> Result<(), StorageError> {
    let tx = conn.transaction()?;

    // 1. Upsert document
    tx.execute(
        "INSERT INTO documents (id, type, title, file_path, schema_version, pinned, created_at, updated_at)
         VALUES (?1, 'dsm', ?2, 'notes/dsm.json', ?3, 1, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            schema_version = excluded.schema_version,
            updated_at = excluded.updated_at",
        params![doc.id, doc.title, doc.schema_version, doc.created_at, doc.updated_at],
    )?;

    // 2. Clean previous entries and FTS blocks for dsm_master
    tx.execute("DELETE FROM dsm_entries WHERE document_id = ?1", params![doc.id])?;
    tx.execute("DELETE FROM tags WHERE document_id = ?1", params![doc.id])?;
    tx.execute("DELETE FROM resources WHERE parent_document_id = ?1", params![doc.id])?;
    tx.execute("DELETE FROM fts_blocks WHERE document_id = ?1", params![doc.id])?;
    tx.execute("DELETE FROM fts_code_trigram WHERE document_id = ?1", params![doc.id])?;

    // 3. Re-insert DSM entries and blocks
    for entry in &doc.entries {
        tx.execute(
            "INSERT INTO dsm_entries (id, document_id, entry_date, collapsed, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                entry.id,
                doc.id,
                entry.date,
                if entry.collapsed { 1 } else { 0 },
                entry.created_at,
                entry.updated_at
            ],
        )?;

        let tags_str = entry.tags.join(" ");
        for tag in &entry.tags {
            tx.execute(
                "INSERT OR IGNORE INTO tags (tag, document_id, entry_id) VALUES (?1, ?2, ?3)",
                params![tag, doc.id, entry.id],
            )?;
        }

        let blocks = extract_blocks(&entry.content);
        for blk in blocks {
            tx.execute(
                "INSERT INTO fts_blocks (block_id, document_id, document_type, entry_id, entry_date, block_type, language, tags, content)
                 VALUES (?1, ?2, 'dsm', ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    blk.block_id,
                    doc.id,
                    entry.id,
                    entry.date,
                    blk.block_type,
                    blk.language.as_deref().unwrap_or(""),
                    tags_str,
                    blk.content
                ],
            )?;

            if blk.block_type == "codeBlock" || blk.block_type == "code" {
                tx.execute(
                    "INSERT INTO fts_code_trigram (block_id, document_id, language, code_content)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![
                        blk.block_id,
                        doc.id,
                        blk.language.as_deref().unwrap_or(""),
                        blk.content
                    ],
                )?;

                let res_id = format!("res_{}", blk.block_id);
                tx.execute(
                    "INSERT OR REPLACE INTO resources (id, resource_type, parent_document_id, entry_id, block_id, title, language, target_url, asset_id)
                     VALUES (?1, 'code', ?2, ?3, ?4, ?5, ?6, NULL, NULL)",
                    params![
                        res_id,
                        doc.id,
                        entry.id,
                        blk.block_id,
                        "Code snippet",
                        blk.language.as_deref().unwrap_or("text")
                    ],
                )?;
            }
        }
    }

    tx.commit()?;
    Ok(())
}

/// Indexes or updates a General note in SQLite.
pub fn index_general_note(conn: &mut Connection, note: &GeneralNote) -> Result<(), StorageError> {
    let tx = conn.transaction()?;
    let file_path = format!("notes/{}.json", note.id);

    // 1. Upsert document
    tx.execute(
        "INSERT INTO documents (id, type, title, file_path, schema_version, pinned, created_at, updated_at)
         VALUES (?1, 'general', ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            file_path = excluded.file_path,
            schema_version = excluded.schema_version,
            pinned = excluded.pinned,
            updated_at = excluded.updated_at",
        params![
            note.id,
            note.title,
            file_path,
            note.schema_version,
            if note.pinned { 1 } else { 0 },
            note.created_at,
            note.updated_at
        ],
    )?;

    // 2. Clean previous indices for this note
    tx.execute("DELETE FROM tags WHERE document_id = ?1", params![note.id])?;
    tx.execute("DELETE FROM resources WHERE parent_document_id = ?1", params![note.id])?;
    tx.execute("DELETE FROM fts_blocks WHERE document_id = ?1", params![note.id])?;
    tx.execute("DELETE FROM fts_code_trigram WHERE document_id = ?1", params![note.id])?;

    // 3. Re-index tags
    let tags_str = note.tags.join(" ");
    for tag in &note.tags {
        tx.execute(
            "INSERT OR IGNORE INTO tags (tag, document_id, entry_id) VALUES (?1, ?2, NULL)",
            params![tag, note.id],
        )?;
    }

    // 4. Re-index blocks
    let blocks = extract_blocks(&note.content);
    for blk in blocks {
        tx.execute(
            "INSERT INTO fts_blocks (block_id, document_id, document_type, entry_id, entry_date, block_type, language, tags, content)
             VALUES (?1, ?2, 'general', NULL, NULL, ?3, ?4, ?5, ?6)",
            params![
                blk.block_id,
                note.id,
                blk.block_type,
                blk.language.as_deref().unwrap_or(""),
                tags_str,
                blk.content
            ],
        )?;

        if blk.block_type == "codeBlock" || blk.block_type == "code" {
            tx.execute(
                "INSERT INTO fts_code_trigram (block_id, document_id, language, code_content)
                 VALUES (?1, ?2, ?3, ?4)",
                params![
                    blk.block_id,
                    note.id,
                    blk.language.as_deref().unwrap_or(""),
                    blk.content
                ],
            )?;

            let res_id = format!("res_{}", blk.block_id);
            tx.execute(
                "INSERT OR REPLACE INTO resources (id, resource_type, parent_document_id, entry_id, block_id, title, language, target_url, asset_id)
                 VALUES (?1, 'code', ?2, NULL, ?3, ?4, ?5, NULL, NULL)",
                params![
                    res_id,
                    note.id,
                    blk.block_id,
                    note.title,
                    blk.language.as_deref().unwrap_or("text")
                ],
            )?;
        }
    }

    tx.commit()?;
    Ok(())
}

/// Removes a General note and all associated index data from SQLite.
pub fn remove_general_note(conn: &mut Connection, note_id: &str) -> Result<(), StorageError> {
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM documents WHERE id = ?1", params![note_id])?;
    tx.execute("DELETE FROM tags WHERE document_id = ?1", params![note_id])?;
    tx.execute("DELETE FROM backlinks WHERE source_document_id = ?1 OR target_note_id = ?1", params![note_id])?;
    tx.execute("DELETE FROM resources WHERE parent_document_id = ?1", params![note_id])?;
    tx.execute("DELETE FROM fts_blocks WHERE document_id = ?1", params![note_id])?;
    tx.execute("DELETE FROM fts_code_trigram WHERE document_id = ?1", params![note_id])?;
    tx.commit()?;
    Ok(())
}

/// Completely reconstructs the SQLite index database from disk JSON files.
/// Used for disaster recovery or when `.chronote/index.db` is missing or out of date.
pub fn rebuild_index_from_disk(
    conn: &mut Connection,
    workspace_root: &Path,
) -> Result<IndexStats, StorageError> {
    let notes_dir = workspace_root.join("notes");
    if !notes_dir.exists() {
        return Ok(IndexStats {
            indexed_documents: 0,
            indexed_blocks: 0,
            indexed_tags: 0,
        });
    }

    // Index DSM document if present
    let dsm_path = notes_dir.join("dsm.json");
    if dsm_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&dsm_path) {
            if let Ok(dsm) = serde_json::from_str::<DsmDocument>(&content) {
                index_dsm(conn, &dsm)?;
            }
        }
    }

    // Index all general notes
    for entry in std::fs::read_dir(&notes_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with("not_") && name.ends_with(".json") {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        if let Ok(note) = serde_json::from_str::<GeneralNote>(&content) {
                            index_general_note(conn, &note)?;
                        }
                    }
                }
            }
        }
    }

    // Collect index statistics
    let doc_count: i64 = conn.query_row("SELECT COUNT(*) FROM documents", [], |r| r.get(0))?;
    let block_count: i64 = conn.query_row("SELECT COUNT(*) FROM fts_blocks", [], |r| r.get(0))?;
    let tag_count: i64 = conn.query_row("SELECT COUNT(DISTINCT tag) FROM tags", [], |r| r.get(0))?;

    Ok(IndexStats {
        indexed_documents: doc_count as usize,
        indexed_blocks: block_count as usize,
        indexed_tags: tag_count as usize,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::models::DsmEntry;
    use tempfile::tempdir;

    #[test]
    fn test_sqlite_schema_initialization() {
        let temp_dir = tempdir().unwrap();
        let conn = open_or_create_index_db(temp_dir.path()).expect("DB creation must succeed");

        let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap();
        assert_eq!(version, 1);

        // Verify fts_blocks table exists
        let fts_blocks_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM fts_blocks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fts_blocks_count, 0);

        // Verify fts_code_trigram exists
        let trigram_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM fts_code_trigram", [], |r| r.get(0))
            .unwrap();
        assert_eq!(trigram_count, 0);
    }

    #[test]
    fn test_index_and_fts_query() {
        let temp_dir = tempdir().unwrap();
        let mut conn = open_or_create_index_db(temp_dir.path()).unwrap();

        let note = GeneralNote {
            id: "not_auth123".to_string(),
            schema_version: 1,
            title: "Authentication Token Guide".to_string(),
            tags: vec!["jwt".to_string(), "backend".to_string()],
            content: serde_json::json!({
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "attrs": { "id": "blk_p1" },
                        "content": [{ "type": "text", "text": "Implemented JWT auth filter." }]
                    },
                    {
                        "type": "codeBlock",
                        "attrs": { "id": "blk_c1", "language": "java" },
                        "content": [{ "type": "text", "text": "public class JwtFilter extends OncePerRequestFilter {}" }]
                    }
                ]
            }),
            pinned: false,
            created_at: "2026-09-16T10:00:00Z".to_string(),
            updated_at: "2026-09-16T10:00:00Z".to_string(),
        };

        index_general_note(&mut conn, &note).unwrap();

        // Query FTS5
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM fts_blocks WHERE fts_blocks MATCH 'JwtFilter'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);

        // Query trigram index
        let trigram_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM fts_code_trigram WHERE fts_code_trigram MATCH 'OncePerRequest'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(trigram_count, 1);
    }

    #[test]
    fn test_rebuild_index_from_disk() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();
        let notes_dir = root.join("notes");
        std::fs::create_dir_all(&notes_dir).unwrap();

        // Write a mock dsm.json
        let dsm = DsmDocument {
            id: "dsm_master".to_string(),
            schema_version: 1,
            title: "DSM".to_string(),
            created_at: "2026-09-16T00:00:00Z".to_string(),
            updated_at: "2026-09-16T00:00:00Z".to_string(),
            entries: vec![DsmEntry {
                id: "ent_01".to_string(),
                date: "2026-09-16".to_string(),
                tags: vec!["mongodb".to_string()],
                collapsed: false,
                content: serde_json::json!({
                    "type": "doc",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": { "id": "blk_d1" },
                            "content": [{ "type": "text", "text": "Aggregated daily metrics." }]
                        }
                    ]
                }),
                created_at: "2026-09-16T08:00:00Z".to_string(),
                updated_at: "2026-09-16T08:00:00Z".to_string(),
            }],
        };
        std::fs::write(notes_dir.join("dsm.json"), serde_json::to_string(&dsm).unwrap()).unwrap();

        let mut conn = open_or_create_index_db(root).unwrap();
        let stats = rebuild_index_from_disk(&mut conn, root).unwrap();

        assert_eq!(stats.indexed_documents, 1);
        assert_eq!(stats.indexed_blocks, 1);
        assert_eq!(stats.indexed_tags, 1);
    }
}
