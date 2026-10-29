use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::storage::error::StorageError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultItem {
    pub block_id: String,
    pub document_id: String,
    pub document_type: String,
    pub document_title: String,
    pub entry_id: Option<String>,
    pub entry_date: Option<String>,
    pub block_type: String,
    pub language: Option<String>,
    pub tags: Vec<String>,
    pub excerpt: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceReference {
    pub id: String,
    pub resource_type: String,
    pub parent_document_id: String,
    pub parent_document_type: String,
    pub entry_id: Option<String>,
    pub entry_date: Option<String>,
    pub block_id: String,
    pub title: String,
    pub snippet: Option<String>,
    pub language: Option<String>,
    pub target_url: Option<String>,
    pub asset_id: Option<String>,
    pub target_note_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BacklinkReference {
    pub source_document_id: String,
    pub source_document_type: String,
    pub source_document_title: String,
    pub source_entry_id: Option<String>,
    pub source_entry_date: Option<String>,
    pub target_note_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: String,
    pub title: String,
    pub doc_type: String,
    pub tags: Vec<String>,
    pub updated_at: Option<String>,
    pub in_degree: usize,
    pub out_degree: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub source_id: String,
    pub source_title: String,
    pub source_entry_id: Option<String>,
    pub source_entry_date: Option<String>,
    pub target_id: String,
    pub target_title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BacklinksGraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Default)]
pub struct ParsedSearchQuery {
    pub text_tokens: Vec<String>,
    pub exact_phrases: Vec<String>,
    pub tags: Vec<String>,
    pub block_types: Vec<String>,
    pub document_types: Vec<String>,
    pub languages: Vec<String>,
    pub exact_date: Option<String>,
    pub after_date: Option<String>,
    pub before_date: Option<String>,
}

/// Tokenizes raw query respecting double quotes
pub fn tokenize_query(raw: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut inside_quotes = false;

    for c in raw.chars() {
        if c == '"' {
            inside_quotes = !inside_quotes;
            current.push(c);
        } else if (c == ' ' || c == '\t' || c == '\n') && !inside_quotes {
            let trimmed = current.trim();
            if !trimmed.is_empty() {
                tokens.push(trimmed.to_string());
                current.clear();
            }
        } else {
            current.push(c);
        }
    }

    let trimmed = current.trim();
    if !trimmed.is_empty() {
        tokens.push(trimmed.to_string());
    }

    tokens
}

/// Parses raw query string into structured query predicates
pub fn parse_query(raw: &str) -> ParsedSearchQuery {
    let mut pq = ParsedSearchQuery::default();
    let tokens = tokenize_query(raw);

    for token in tokens {
        if token.starts_with('"') && token.ends_with('"') && token.len() >= 2 {
            let phrase = token[1..token.len() - 1].trim();
            if !phrase.is_empty() {
                pq.exact_phrases.push(phrase.to_string());
            }
            continue;
        }

        if let Some(colon_idx) = token.find(':') {
            if colon_idx > 0 {
                let key = token[..colon_idx].to_ascii_lowercase();
                let mut val = &token[colon_idx + 1..];
                if val.starts_with('"') && val.ends_with('"') && val.len() >= 2 {
                    val = &val[1..val.len() - 1];
                }
                let val = val.trim();

                if !val.is_empty() {
                    match key.as_str() {
                        "tag" => {
                            let clean = val.trim_start_matches('#').to_ascii_lowercase();
                            if !pq.tags.contains(&clean) {
                                pq.tags.push(clean);
                            }
                        }
                        "type" => {
                            let t = val.to_ascii_lowercase();
                            if t == "dsm" {
                                if !pq.document_types.contains(&"dsm".to_string()) {
                                    pq.document_types.push("dsm".to_string());
                                }
                            } else if t == "note" || t == "general" {
                                if !pq.document_types.contains(&"general".to_string()) {
                                    pq.document_types.push("general".to_string());
                                }
                            } else if !pq.block_types.contains(&t) {
                                pq.block_types.push(t);
                            }
                        }
                        "lang" | "language" => {
                            let l = val.to_ascii_lowercase();
                            if !pq.languages.contains(&l) {
                                pq.languages.push(l);
                            }
                        }
                        "date" => {
                            pq.exact_date = Some(val.to_string());
                        }
                        "after" => {
                            pq.after_date = Some(val.to_string());
                        }
                        "before" => {
                            pq.before_date = Some(val.to_string());
                        }
                        _ => {
                            pq.text_tokens.push(token);
                        }
                    }
                    continue;
                }
            }
        }

        pq.text_tokens.push(token);
    }

    pq
}

fn sanitize_token(s: &str) -> String {
    let has_star = s.ends_with('*');
    let mut clean: String = s.chars().filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-').collect();
    if clean.is_empty() {
        return clean;
    }
    if has_star {
        clean.push('*');
    }
    clean
}

/// Executes FTS5 search with BM25 ranking and snippet generation (< 50 ms).
pub fn search_fts(conn: &Connection, raw_query: &str) -> Result<Vec<SearchResultItem>, StorageError> {
    let raw_trimmed = raw_query.trim();
    if raw_trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let parsed = parse_query(raw_trimmed);

    // Build FTS5 MATCH expression
    let mut match_parts = Vec::new();

    for tag in &parsed.tags {
        let clean = sanitize_token(tag);
        if !clean.is_empty() {
            match_parts.push(format!("tags:{}", clean));
        }
    }

    for bt in &parsed.block_types {
        if bt == "code" {
            match_parts.push("block_type:code*".to_string());
        } else {
            let clean = sanitize_token(bt);
            if !clean.is_empty() {
                match_parts.push(format!("block_type:{}", clean));
            }
        }
    }

    for lang in &parsed.languages {
        let clean = sanitize_token(lang);
        if !clean.is_empty() {
            match_parts.push(format!("language:{}", clean));
        }
    }

    for phrase in &parsed.exact_phrases {
        let clean = phrase.replace('"', "\"\"");
        if !clean.trim().is_empty() {
            match_parts.push(format!("\"{}\"", clean));
        }
    }

    for token in &parsed.text_tokens {
        let clean = sanitize_token(token);
        if !clean.is_empty() {
            let term = if clean.ends_with('*') { clean } else { format!("{}*", clean) };
            match_parts.push(term);
        }
    }

    let match_expr = match_parts.join(" AND ");

    // Build SQL query
    let mut sql = String::from(
        "SELECT 
            b.block_id,
            b.document_id,
            b.document_type,
            COALESCE(d.title, CASE WHEN b.document_type = 'dsm' THEN 'Daily Stand-up Journal' ELSE 'Untitled Note' END) AS document_title,
            b.entry_id,
            b.entry_date,
            b.block_type,
            b.language,
            b.tags,
            "
    );

    if !match_expr.is_empty() {
        sql.push_str("snippet(fts_blocks, 8, '<mark>', '</mark>', '...', 16) AS excerpt, ");
        sql.push_str("bm25(fts_blocks, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 5.0, 10.0) AS rank ");
    } else {
        sql.push_str("substr(b.content, 1, 160) AS excerpt, ");
        sql.push_str("0.0 AS rank ");
    }

    sql.push_str(
        "FROM fts_blocks b
         LEFT JOIN documents d ON b.document_id = d.id
         WHERE 1=1 "
    );

    let mut bind_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if !match_expr.is_empty() {
        sql.push_str("AND fts_blocks MATCH ? ");
        bind_params.push(Box::new(match_expr));
    }

    if let Some(date) = &parsed.exact_date {
        sql.push_str("AND b.entry_date = ? ");
        bind_params.push(Box::new(date.clone()));
    }

    if let Some(after) = &parsed.after_date {
        sql.push_str("AND b.entry_date >= ? ");
        bind_params.push(Box::new(after.clone()));
    }

    if let Some(before) = &parsed.before_date {
        sql.push_str("AND b.entry_date <= ? ");
        bind_params.push(Box::new(before.clone()));
    }

    if !parsed.document_types.is_empty() {
        if parsed.document_types.len() == 1 {
            sql.push_str("AND b.document_type = ? ");
            bind_params.push(Box::new(parsed.document_types[0].clone()));
        }
    }

    if !match_parts.is_empty() {
        sql.push_str("ORDER BY rank ASC LIMIT 50;");
    } else {
        sql.push_str("ORDER BY b.entry_date DESC, b.rowid DESC LIMIT 50;");
    }

    let mut stmt = conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = bind_params.iter().map(|b| b.as_ref()).collect();

    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        let tags_raw: String = row.get(8).unwrap_or_default();
        let tags_vec = tags_raw
            .split_whitespace()
            .map(|s| s.to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let doc_type: String = row.get(2)?;
        let mut doc_title: String = row.get(3)?;
        let entry_date: Option<String> = row.get(5)?;

        if doc_type == "dsm" {
            if let Some(ref d) = entry_date {
                doc_title = format!("DSM Stand-up ({})", d);
            }
        }

        Ok(SearchResultItem {
            block_id: row.get(0)?,
            document_id: row.get(1)?,
            document_type: doc_type,
            document_title: doc_title,
            entry_id: row.get(4)?,
            entry_date,
            block_type: row.get(6)?,
            language: row.get(7)?,
            tags: tags_vec,
            excerpt: row.get(9)?,
            score: row.get(10)?,
        })
    })?;

    let mut results = Vec::new();
    for r in rows {
        results.push(r?);
    }

    Ok(results)
}

/// Queries extracted resources (code blocks, images, links, attachments) from SQLite.
pub fn get_resources_by_filter(
    conn: &Connection,
    document_id: Option<&str>,
    resource_type: Option<&str>,
) -> Result<Vec<ResourceReference>, StorageError> {
    let mut sql = String::from(
        "SELECT 
            r.id,
            r.resource_type,
            r.parent_document_id,
            d.type AS parent_document_type,
            r.entry_id,
            e.entry_date,
            r.block_id,
            r.title,
            r.language,
            r.target_url,
            r.asset_id
        FROM resources r
        LEFT JOIN documents d ON r.parent_document_id = d.id
        LEFT JOIN dsm_entries e ON r.entry_id = e.id
        WHERE 1=1 "
    );

    let mut bind_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(doc_id) = document_id {
        sql.push_str("AND r.parent_document_id = ? ");
        bind_params.push(Box::new(doc_id.to_string()));
    }

    if let Some(res_type) = resource_type {
        sql.push_str("AND r.resource_type = ? ");
        bind_params.push(Box::new(res_type.to_string()));
    }

    sql.push_str("ORDER BY r.rowid DESC LIMIT 200;");

    let mut stmt = conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = bind_params.iter().map(|b| b.as_ref()).collect();

    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        let parent_type: String = row.get(3).unwrap_or_else(|_| "general".to_string());
        Ok(ResourceReference {
            id: row.get(0)?,
            resource_type: row.get(1)?,
            parent_document_id: row.get(2)?,
            parent_document_type: parent_type,
            entry_id: row.get(4)?,
            entry_date: row.get(5)?,
            block_id: row.get(6)?,
            title: row.get(7)?,
            snippet: None,
            language: row.get(8)?,
            target_url: row.get(9)?,
            asset_id: row.get(10)?,
            target_note_id: None,
        })
    })?;

    let mut results = Vec::new();
    for r in rows {
        results.push(r?);
    }

    Ok(results)
}

/// Queries all notes and DSM entries referencing a target note via [[...]] links.
pub fn get_backlinks_for_note(
    conn: &Connection,
    target_note_id: &str,
) -> Result<Vec<BacklinkReference>, StorageError> {
    let sql = "
        SELECT 
            b.source_document_id,
            d.type AS source_document_type,
            COALESCE(d.title, CASE WHEN d.type = 'dsm' THEN 'Daily Stand-up Journal' ELSE 'Untitled Note' END) AS source_document_title,
            b.source_entry_id,
            e.entry_date,
            b.target_note_id
        FROM backlinks b
        LEFT JOIN documents d ON b.source_document_id = d.id
        LEFT JOIN dsm_entries e ON b.source_entry_id = e.id
        WHERE b.target_note_id = ?1
        ORDER BY b.rowid DESC;
    ";

    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(params![target_note_id], |row| {
        let doc_type: String = row.get(1).unwrap_or_else(|_| "general".to_string());
        let mut title: String = row.get(2).unwrap_or_else(|_| "Untitled".to_string());
        let entry_date: Option<String> = row.get(4)?;

        if doc_type == "dsm" {
            if let Some(ref d) = entry_date {
                title = format!("DSM Stand-up ({})", d);
            }
        }

        Ok(BacklinkReference {
            source_document_id: row.get(0)?,
            source_document_type: doc_type,
            source_document_title: title,
            source_entry_id: row.get(3)?,
            source_entry_date: entry_date,
            target_note_id: row.get(5)?,
        })
    })?;

    let mut results = Vec::new();
    for r in rows {
        results.push(r?);
    }

    Ok(results)
}

/// Queries the entire knowledge graph of document nodes and directional backlinks.
pub fn get_backlinks_graph(conn: &Connection) -> Result<BacklinksGraphData, StorageError> {
    // 1. Fetch all documents
    let mut stmt_docs = conn.prepare("
        SELECT id, type, COALESCE(title, CASE WHEN type = 'dsm' THEN 'Daily Stand-up Journal' ELSE 'Untitled Note' END), updated_at
        FROM documents;
    ")?;

    struct RawDoc {
        id: String,
        doc_type: String,
        title: String,
        updated_at: Option<String>,
    }

    let mut doc_map = std::collections::HashMap::new();
    let doc_rows = stmt_docs.query_map([], |row| {
        Ok(RawDoc {
            id: row.get(0)?,
            doc_type: row.get(1)?,
            title: row.get(2)?,
            updated_at: row.get(3)?,
        })
    })?;

    for d in doc_rows {
        let d = d?;
        doc_map.insert(d.id.clone(), d);
    }

    // 2. Fetch tags grouped by document_id
    let mut stmt_tags = conn.prepare("SELECT document_id, tag FROM tags;")?;
    let mut tags_map: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    let tag_rows = stmt_tags.query_map([], |row| {
        let doc_id: String = row.get(0)?;
        let tag: String = row.get(1)?;
        Ok((doc_id, tag))
    })?;

    for tr in tag_rows {
        let (doc_id, tag) = tr?;
        tags_map.entry(doc_id).or_default().push(tag);
    }

    // 3. Fetch all backlinks edges
    let mut stmt_edges = conn.prepare("
        SELECT 
            b.source_document_id,
            COALESCE(sd.title, CASE WHEN sd.type = 'dsm' THEN 'Daily Stand-up Journal' ELSE 'Untitled Note' END) AS source_title,
            b.source_entry_id,
            e.entry_date,
            b.target_note_id,
            COALESCE(td.title, 'Untitled Note') AS target_title
        FROM backlinks b
        LEFT JOIN documents sd ON b.source_document_id = sd.id
        LEFT JOIN documents td ON b.target_note_id = td.id
        LEFT JOIN dsm_entries e ON b.source_entry_id = e.id
        ORDER BY b.rowid ASC;
    ")?;

    let mut edges = Vec::new();
    let mut in_degrees: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut out_degrees: std::collections::HashMap<String, usize> = std::collections::HashMap::new();

    let edge_rows = stmt_edges.query_map([], |row| {
        let source_id: String = row.get(0)?;
        let mut source_title: String = row.get(1)?;
        let source_entry_id: Option<String> = row.get(2)?;
        let source_entry_date: Option<String> = row.get(3)?;
        let target_id: String = row.get(4)?;
        let target_title: String = row.get(5)?;

        if let Some(ref d) = source_entry_date {
            source_title = format!("DSM ({})", d);
        }

        Ok(GraphEdge {
            source_id,
            source_title,
            source_entry_id,
            source_entry_date,
            target_id,
            target_title,
        })
    })?;

    for er in edge_rows {
        let edge = er?;
        *out_degrees.entry(edge.source_id.clone()).or_insert(0) += 1;
        *in_degrees.entry(edge.target_id.clone()).or_insert(0) += 1;
        edges.push(edge);
    }

    // 4. Construct graph nodes
    let mut nodes = Vec::new();
    for (id, raw) in &doc_map {
        let node_tags = tags_map.get(id).cloned().unwrap_or_default();
        let in_deg = *in_degrees.get(id).unwrap_or(&0);
        let out_deg = *out_degrees.get(id).unwrap_or(&0);

        nodes.push(GraphNode {
            id: id.clone(),
            title: raw.title.clone(),
            doc_type: raw.doc_type.clone(),
            tags: node_tags,
            updated_at: raw.updated_at.clone(),
            in_degree: in_deg,
            out_degree: out_deg,
        });
    }

    // Sort nodes stably by title
    nodes.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));

    Ok(BacklinksGraphData { nodes, edges })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::{open_or_create_index_db, index_general_note, index_dsm};
    use crate::storage::models::{GeneralNote, DsmDocument, DsmEntry};
    use tempfile::tempdir;

    #[test]
    fn test_search_fts_with_snippets_and_ranking() {
        let temp_dir = tempdir().unwrap();
        let mut conn = open_or_create_index_db(temp_dir.path()).unwrap();

        let note = GeneralNote {
            id: "not_search_1".to_string(),
            schema_version: 1,
            title: "Spring Security JWT Guide".to_string(),
            tags: vec!["springboot".to_string(), "backend".to_string()],
            section: "General".to_string(),
            content: serde_json::json!({
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "attrs": { "id": "blk_p1" },
                        "content": [{ "type": "text", "text": "Configured JWT authentication filter in Spring Boot." }]
                    },
                    {
                        "type": "codeBlock",
                        "attrs": { "id": "blk_c1", "language": "java" },
                        "content": [{ "type": "text", "text": "public class SecurityConfig extends WebSecurityConfigurerAdapter {}" }]
                    }
                ]
            }),
            pinned: false,
            created_at: "2026-09-16T10:00:00Z".to_string(),
            updated_at: "2026-09-16T10:00:00Z".to_string(),
        };

        index_general_note(&mut conn, &note).unwrap();

        let results = search_fts(&conn, "tag:springboot authentication").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].block_id, "blk_p1");
        assert!(results[0].excerpt.contains("<mark>"));
        assert!(results[0].excerpt.contains("authentication"));
    }

    #[test]
    fn test_search_code_filter() {
        let temp_dir = tempdir().unwrap();
        let mut conn = open_or_create_index_db(temp_dir.path()).unwrap();

        let note = GeneralNote {
            id: "not_code_1".to_string(),
            schema_version: 1,
            title: "Database Indexing".to_string(),
            tags: vec!["sql".to_string()],
            section: "General".to_string(),
            content: serde_json::json!({
                "type": "doc",
                "content": [
                    {
                        "type": "codeBlock",
                        "attrs": { "id": "blk_sql1", "language": "sql" },
                        "content": [{ "type": "text", "text": "CREATE INDEX idx_user_email ON users(email);" }]
                    }
                ]
            }),
            pinned: false,
            created_at: "2026-09-16T10:00:00Z".to_string(),
            updated_at: "2026-09-16T10:00:00Z".to_string(),
        };

        index_general_note(&mut conn, &note).unwrap();

        let results = search_fts(&conn, "type:code lang:sql users").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].language.as_deref(), Some("sql"));
    }

    #[test]
    fn test_search_dsm_date_range() {
        let temp_dir = tempdir().unwrap();
        let mut conn = open_or_create_index_db(temp_dir.path()).unwrap();

        let dsm = DsmDocument {
            id: "dsm_master".to_string(),
            schema_version: 1,
            title: "Daily Stand-up Journal".to_string(),
            created_at: "2026-09-01T00:00:00Z".to_string(),
            updated_at: "2026-09-16T00:00:00Z".to_string(),
            entries: vec![
                DsmEntry {
                    id: "ent_01".to_string(),
                    date: "2026-09-10".to_string(),
                    tags: vec!["incident".to_string()],
                    collapsed: false,
                    content: serde_json::json!({
                        "type": "doc",
                        "content": [{
                            "type": "paragraph",
                            "attrs": { "id": "blk_d1" },
                            "content": [{ "type": "text", "text": "Resolved database connection timeout outage." }]
                        }]
                    }),
                    created_at: "2026-09-10T09:00:00Z".to_string(),
                    updated_at: "2026-09-10T09:00:00Z".to_string(),
                },
                DsmEntry {
                    id: "ent_02".to_string(),
                    date: "2026-09-15".to_string(),
                    tags: vec!["incident".to_string()],
                    collapsed: false,
                    content: serde_json::json!({
                        "type": "doc",
                        "content": [{
                            "type": "paragraph",
                            "attrs": { "id": "blk_d2" },
                            "content": [{ "type": "text", "text": "Redis cache eviction spike investigation." }]
                        }]
                    }),
                    created_at: "2026-09-15T09:00:00Z".to_string(),
                    updated_at: "2026-09-15T09:00:00Z".to_string(),
                }
            ],
        };

        index_dsm(&mut conn, &dsm).unwrap();

        // Query with after:2026-09-12
        let results = search_fts(&conn, "type:dsm after:2026-09-12 incident").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].entry_date.as_deref(), Some("2026-09-15"));
    }

    #[test]
    fn test_get_backlinks_graph() {
        let temp_dir = tempdir().unwrap();
        let mut conn = open_or_create_index_db(temp_dir.path()).unwrap();

        let note1 = GeneralNote {
            id: "not_a".to_string(),
            schema_version: 1,
            title: "Architecture Doc".to_string(),
            tags: vec!["arch".to_string()],
            section: "General".to_string(),
            content: serde_json::json!({
                "type": "doc",
                "content": [{
                    "type": "paragraph",
                    "content": [{
                        "type": "text",
                        "marks": [{
                            "type": "internalLink",
                            "attrs": { "targetNoteId": "not_b", "originalTitle": "Database Schema" }
                        }],
                        "text": "Database Schema"
                    }]
                }]
            }),
            pinned: false,
            created_at: "2026-10-01T00:00:00Z".to_string(),
            updated_at: "2026-10-01T00:00:00Z".to_string(),
        };

        let note2 = GeneralNote {
            id: "not_b".to_string(),
            schema_version: 1,
            title: "Database Schema".to_string(),
            tags: vec!["db".to_string()],
            section: "General".to_string(),
            content: serde_json::json!({
                "type": "doc",
                "content": [{ "type": "paragraph" }]
            }),
            pinned: false,
            created_at: "2026-10-01T00:00:00Z".to_string(),
            updated_at: "2026-10-01T00:00:00Z".to_string(),
        };

        index_general_note(&mut conn, &note1).unwrap();
        index_general_note(&mut conn, &note2).unwrap();

        let graph = get_backlinks_graph(&conn).unwrap();
        assert_eq!(graph.nodes.len(), 2);
        assert_eq!(graph.edges.len(), 1);
        assert_eq!(graph.edges[0].source_id, "not_a");
        assert_eq!(graph.edges[0].target_id, "not_b");

        let node_a = graph.nodes.iter().find(|n| n.id == "not_a").unwrap();
        assert_eq!(node_a.out_degree, 1);
        assert_eq!(node_a.in_degree, 0);

        let node_b = graph.nodes.iter().find(|n| n.id == "not_b").unwrap();
        assert_eq!(node_b.in_degree, 1);
        assert_eq!(node_b.out_degree, 0);
    }
}
