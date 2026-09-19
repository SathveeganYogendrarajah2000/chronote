use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::Instant;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::state::AppState;

static APP_START_TIME: OnceLock<Instant> = OnceLock::new();

pub fn init_perf_timer() {
    APP_START_TIME.get_or_init(Instant::now);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceMetrics {
    pub memory_rss_bytes: u64,
    pub memory_rss_mb: f64,
    pub db_size_bytes: u64,
    pub total_documents: usize,
    pub total_blocks: usize,
    pub total_tags: usize,
    pub uptime_seconds: u64,
}

#[cfg(windows)]
fn get_process_memory_rss() -> u64 {
    #[repr(C)]
    struct ProcessMemoryCounters {
        cb: u32,
        page_fault_count: u32,
        peak_working_set_size: usize,
        working_set_size: usize,
        quota_peak_paged_pool_usage: usize,
        quota_paged_pool_usage: usize,
        quota_peak_non_paged_pool_usage: usize,
        quota_non_paged_pool_usage: usize,
        pagefile_usage: usize,
        peak_pagefile_usage: usize,
    }

    extern "system" {
        fn GetCurrentProcess() -> isize;
        fn K32GetProcessMemoryInfo(
            process: isize,
            counters: *mut ProcessMemoryCounters,
            cb: u32,
        ) -> i32;
    }

    unsafe {
        let mut pmc: ProcessMemoryCounters = std::mem::zeroed();
        pmc.cb = std::mem::size_of::<ProcessMemoryCounters>() as u32;
        let process = GetCurrentProcess();
        if K32GetProcessMemoryInfo(process, &mut pmc, pmc.cb) != 0 {
            pmc.working_set_size as u64
        } else {
            0
        }
    }
}

#[cfg(not(windows))]
fn get_process_memory_rss() -> u64 {
    0
}

#[tauri::command]
pub fn get_performance_metrics(state: State<AppState>) -> Result<PerformanceMetrics, String> {
    init_perf_timer();
    let start_time = APP_START_TIME.get().copied().unwrap_or_else(Instant::now);
    let uptime_seconds = start_time.elapsed().as_secs();

    let rss_bytes = get_process_memory_rss();
    let rss_mb = (rss_bytes as f64) / (1024.0 * 1024.0);

    let guard = state.context.lock().map_err(|e| e.to_string())?;

    let mut db_size_bytes = 0u64;
    let mut total_documents = 0usize;
    let mut total_blocks = 0usize;
    let mut total_tags = 0usize;

    if let Some(ctx) = guard.as_ref() {
        let db_path: PathBuf = ctx.root.join(".chronote").join("index.db");
        if let Ok(meta) = std::fs::metadata(&db_path) {
            db_size_bytes = meta.len();
        }

        if let Ok(count) = ctx.db.query_row("SELECT COUNT(*) FROM documents", [], |r| r.get::<_, i64>(0)) {
            total_documents = count as usize;
        }
        if let Ok(count) = ctx.db.query_row("SELECT COUNT(*) FROM fts_blocks", [], |r| r.get::<_, i64>(0)) {
            total_blocks = count as usize;
        }
        if let Ok(count) = ctx.db.query_row("SELECT COUNT(DISTINCT tag) FROM tags", [], |r| r.get::<_, i64>(0)) {
            total_tags = count as usize;
        }
    }

    Ok(PerformanceMetrics {
        memory_rss_bytes: rss_bytes,
        memory_rss_mb: (rss_mb * 10.0).round() / 10.0,
        db_size_bytes,
        total_documents,
        total_blocks,
        total_tags,
        uptime_seconds,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_perf_timer_initialization() {
        init_perf_timer();
        assert!(APP_START_TIME.get().is_some());
    }

    #[test]
    fn test_get_process_memory_rss_nonzero_on_windows() {
        let rss = get_process_memory_rss();
        #[cfg(windows)]
        assert!(rss > 0, "Expected positive RSS memory on Windows");
        #[cfg(not(windows))]
        let _ = rss;
    }
}
