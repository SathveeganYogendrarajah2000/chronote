use std::time::Instant;
use tempfile::tempdir;

use chronote_lib::database::{open_or_create_index_db, rebuild_index_from_disk};
use chronote_lib::search::search_fts;
use chronote_lib::storage::models::{DsmDocument, DsmEntry, GeneralNote};

#[test]
fn test_large_workspace_stress_and_rebuild_performance() {
    let dir = tempdir().expect("failed to create tempdir");
    let workspace_root = dir.path();
    let notes_dir = workspace_root.join("notes");
    std::fs::create_dir_all(&notes_dir).expect("failed to create notes dir");

    // 1. Create a synthetic DSM document with 60 days of entries
    let mut dsm_entries = Vec::new();
    for day in 1..=60 {
        let date_str = format!("2026-08-{:02}", day % 28 + 1);
        let block_content = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "attrs": { "id": format!("blk_dsm_p_{}", day) },
                    "content": [{ "type": "text", "text": format!("Standup notes for day {}. Profiling query latency and optimizing database memory footprint.", day) }]
                },
                {
                    "type": "codeBlock",
                    "attrs": { "id": format!("blk_dsm_c_{}", day), "language": "sql" },
                    "content": [{ "type": "text", "text": "SELECT * FROM users WHERE status = 'active' AND latency_ms < 30;" }]
                }
            ]
        });

        dsm_entries.push(DsmEntry {
            id: format!("entry_{}", day),
            date: date_str,
            tags: vec!["backend".to_string(), "database".to_string()],
            collapsed: day > 10,
            content: block_content,
            created_at: "2026-08-01T09:00:00Z".to_string(),
            updated_at: "2026-08-01T10:00:00Z".to_string(),
        });
    }

    let dsm = DsmDocument {
        id: "dsm_master".to_string(),
        schema_version: 1,
        title: "Daily Stand-up Journal".to_string(),
        created_at: "2026-08-01T09:00:00Z".to_string(),
        updated_at: "2026-08-01T10:00:00Z".to_string(),
        entries: dsm_entries,
    };
    std::fs::write(
        notes_dir.join("dsm.json"),
        serde_json::to_string(&dsm).unwrap(),
    ).unwrap();

    // 2. Create 1,000 synthetic General notes on disk (each note has 3 blocks, 1 code block, multiple tags)
    let note_count = 1000;
    println!("Generating {} synthetic notes on disk...", note_count);

    for i in 0..note_count {
        let note_id = format!("not_{:06}", i);
        let note_content = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "heading",
                    "attrs": { "level": 1, "id": format!("blk_{}_h1", i) },
                    "content": [{ "type": "text", "text": format!("Engineering Architecture Review Note #{}", i) }]
                },
                {
                    "type": "paragraph",
                    "attrs": { "id": format!("blk_{}_p", i) },
                    "content": [{ "type": "text", "text": format!("Investigating performance benchmarks, atomic saves, and FTS5 snippet matching for cluster node {}.", i) }]
                },
                {
                    "type": "codeBlock",
                    "attrs": { "id": format!("blk_{}_code", i), "language": if i % 2 == 0 { "typescript" } else { "rust" } },
                    "content": [{ "type": "text", "text": format!("pub fn process_batch_{}(items: &[u32]) -> u64 {{ items.iter().sum() }}", i) }]
                }
            ]
        });

        let note = GeneralNote {
            id: note_id.clone(),
            schema_version: 1,
            title: format!("Engineering Architecture Review Note #{}", i),
            tags: vec!["performance".to_string(), "architecture".to_string(), format!("node_{}", i % 10)],
            content: note_content,
            pinned: i == 0,
            created_at: "2026-08-01T09:00:00Z".to_string(),
            updated_at: "2026-08-01T10:00:00Z".to_string(),
        };

        std::fs::write(
            notes_dir.join(format!("{}.json", note_id)),
            serde_json::to_string(&note).unwrap(),
        ).unwrap();
    }

    // 3. Measure SQLite index construction and rebuild latency
    let mut conn = open_or_create_index_db(workspace_root).expect("failed to open db");

    let rebuild_start = Instant::now();
    let stats = rebuild_index_from_disk(&mut conn, workspace_root).expect("failed to rebuild index");
    let rebuild_duration = rebuild_start.elapsed();

    println!(
        "\n==> Rebuilt index for {} documents ({} blocks, {} tags) in {:?}! (Threshold budget: < 700ms)",
        stats.indexed_documents, stats.indexed_blocks, stats.indexed_tags, rebuild_duration
    );

    assert_eq!(stats.indexed_documents, note_count + 1); // 1,000 notes + 1 DSM doc
    assert!(stats.indexed_blocks >= note_count * 3 + 120);
    // Hard ceiling from PERFORMANCE.md is 700 ms for 5,000 notes; 1,000 notes must complete in under 500 ms
    assert!(
        rebuild_duration.as_millis() < 500,
        "Rebuild took {:?}, exceeding 500ms threshold",
        rebuild_duration
    );

    // 4. Benchmark FTS5 Search Latency (< 30ms budget from PERFORMANCE.md)
    let search_start = Instant::now();
    let search_results = search_fts(&conn, "atomic benchmarks tag:performance").expect("search failed");
    let search_duration = search_start.elapsed();

    println!(
        "==> Search for 'atomic benchmarks tag:performance' returned {} results in {:?} (Threshold budget: < 30ms)",
        search_results.len(), search_duration
    );

    assert!(!search_results.is_empty());
    assert!(
        search_duration.as_millis() < 30,
        "Search took {:?}, exceeding 30ms threshold",
        search_duration
    );

    // 5. Benchmark Code Trigram Search Latency
    let code_search_start = Instant::now();
    let code_results = search_fts(&conn, "process_batch lang:rust type:code").expect("code search failed");
    let code_search_duration = code_search_start.elapsed();

    println!(
        "==> Code search for 'process_batch lang:rust type:code' returned {} results in {:?} (Threshold budget: < 50ms)",
        code_results.len(), code_search_duration
    );

    assert!(!code_results.is_empty());
    assert!(
        code_search_duration.as_millis() < 50,
        "Code search took {:?}, exceeding 50ms threshold",
        code_search_duration
    );
}
