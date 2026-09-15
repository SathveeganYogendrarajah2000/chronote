# Chronote Performance Specification

## 1. Measurable Performance Targets

"Lightweight" is an explicit engineering requirement with concrete, testable thresholds. Chronote establishes the following performance budgets for standard developer hardware (e.g. Intel Core i5/i7 or AMD Ryzen 5/7, 16GB RAM, SSD, Windows 10/11):

| Metric | Target Threshold | Hard Ceiling | Measurement Method |
| :--- | :--- | :--- | :--- |
| **Cold Startup Latency** | < 800 ms | 1,200 ms | OS process spawn to interactive editor canvas |
| **Warm Startup Latency** | < 400 ms | 600 ms | Relaunch when OS has cached libraries |
| **Idle Memory (RSS)** | < 90 MB | 130 MB | Combined memory of WebView2 + Rust process |
| **Keystroke-to-Render Latency** | < 16 ms (60 fps) | 24 ms | Keyboard event to DOM paint in editor |
| **Instant Search (10,000 blocks)**| < 30 ms | 50 ms | Query submission to highlighted result list render |
| **Instant Search (50,000 blocks)**| < 60 ms | 100 ms | Query submission to highlighted result list render |
| **Autosave Disk Write Latency** | < 25 ms | 50 ms | Debounced save invocation to atomic `fsync` completion |
| **Full SQLite Rebuild (5,000 notes)**| < 350 ms | 700 ms | Parsing all JSON notes and repopulating FTS5 index |

---

## 2. Editor Rendering & Virtualization Strategy

The DSM Journal represents a continuous timeline of daily entries. Over several years, a journal may contain 1,000+ date entries and tens of thousands of content blocks.

### 2.1 Virtualized Timeline Rendering
- Rendering 1,000 complex DOM subtrees simultaneously causes high memory consumption and layout thrashing in Chromium/WebView2.
- Chronote implements **windowed timeline virtualization** (`react-window` or custom intersection observer):
  - Only visible date entries (plus a 2-entry buffer above and below the viewport) are rendered with full interactive ProseMirror editor instances.
  - Off-screen entries render as lightweight placeholder boxes preserving exact calculated height to maintain scrollbar stability.
  - Collapsed entries render as tiny, static summary bars with zero ProseMirror overhead.

### 2.2 Typing Latency & Input Isolation
- The editor input loop must never be blocked by background operations.
- When an engineer types:
  1. The keystroke immediately updates the local ProseMirror document state (sync).
  2. The changed document is dispatched to the Zustand store via an unblocked React transition.
  3. Disk persistence and FTS re-indexing are debounced (800 ms idle) and executed asynchronously off the UI thread in the Rust backend.

---

## 3. Search Engine Benchmarks (SQLite FTS5)

Full-text queries must maintain sub-50 ms execution even as the workspace expands.

### 3.1 Optimization Strategies
- **Prepared Statements:** FTS5 and metadata queries use persistent cached SQLite prepared statements.
- **Single Connection Pool:** Managed in Rust with `r2d2` or direct mutex-locked `rusqlite::Connection`.
- **WAL Mode (Write-Ahead Logging):**
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA temp_store = MEMORY;
  PRAGMA cache_size = -8000; -- 8 MB in-memory cache
  ```
- **FTS Column Weighting:** Only matches on relevant columns (`content`, `tags`, `language`).

---

## 4. Memory Profiling & Budget Enforcement

To ensure Chronote never creeps toward the 300+ MB footprints common in Electron applications:

### 4.1 Process Budget Allocation
```
Total Idle Budget: 90 MB
├── WebView2 Rendering Process:  ~50 MB
├── WebView2 GPU / Utility:     ~20 MB
└── Rust Native Backend Core:   ~15 MB
```

### 4.2 Leak Prevention Rules
- **No In-Memory Note Caching of Unopened Notes:** Only open tabs and active DSM entries retain ProseMirror state in memory. The global note catalog stores only lightweight metadata (ID, title, tags, updated_at).
- **Asset Streaming:** Images and attachments are streamed directly from the filesystem using custom protocol handlers (`chronote-asset://`) rather than being converted into massive base64 strings in memory.

---

## 5. Automated Performance Benchmarking Harness

To prevent regressions during future development sessions, Chronote provides automated benchmark suites:

1. **Synthetic Workspace Generator (`scripts/generate_test_workspace.ts`):**
   - Generates test workspaces with 500, 5,000, and 20,000 structured notes and DSM entries containing real-world code snippets, tags, and images.
2. **Rust Storage & Search Benchmark (`cargo bench`):**
   - Uses `criterion` to benchmark atomic save throughput, FTS5 query latency, and SQLite index reconstruction speed.
3. **Playwright Frontend Startup & Typing Benchmark:**
   - Launches the compiled desktop application, measures time-to-first-paint, simulates 100 fast keystrokes, and asserts frame rates remain strictly above 60 fps.
