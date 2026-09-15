# ADR-001: Desktop Application Framework Selection

## Status
Accepted

## Date
2026-09-16

## Context
Chronote is a lightweight, local-first desktop engineering notebook designed initially for Windows with future Linux support. Software engineers use it daily to record Stand-up (DSM) entries, code snippets, database queries, and technical notes.

A critical product requirement is that Chronote must be **exceptionally lightweight**:
- Sub-second cold startup (< 800 ms).
- Low idle memory consumption (< 90 MB RSS).
- Fast, zero-lag typing experience (sub-16 ms frame budget).
- Compact installer and minimal background overhead (zero daemon/background service).
- Seamless native operating system integration (filesystem access, clipboard, atomic I/O, SQLite engine).

Furthermore, Chronote is developed by a solo open-source developer with zero budget for commercial licenses or infrastructure.

## Problem
Which desktop application framework satisfies the strict performance, local-first native access, cross-platform extensibility, and maintainability requirements without imposing high memory overhead or complex build toolchains?

## Decision Drivers
1. **Resource Efficiency**: Cold start latency, idle RAM consumption, binary footprint.
2. **Native Capabilities**: Robust direct filesystem I/O, SQLite integration, OS clipboard access.
3. **Web Standards Compatibility**: Modern rich-text web editor ecosystem (ProseMirror / Tiptap).
4. **Platform Support**: Windows first (MSVC / WebView2) with straightforward Linux support (WebKitGTK).
5. **Ecosystem & License**: Permissive open-source licensing (MIT / Apache 2.0), vibrant community, no commercial royalties.
6. **AI Agent Maintainability**: Strong typing, clean separation of concerns between native shell and frontend UI.

## Considered Alternatives

### 1. Electron
* **Pros**:
  - Mature, vast ecosystem; battle-tested by VS Code, Obsidian, and Slack.
  - Bundles Chromium and Node.js, ensuring identical web runtime across all platforms.
  - Trivial integration with web-based rich text editors (Tiptap, Lexical, Slate).
* **Cons**:
  - Extremely heavy memory footprint: Base idle memory typically exceeds 150–220 MB.
  - Massive installer/binary size (often > 80–120 MB unpacked).
  - High cold-start time (often 1.5–3.0 seconds on standard developer laptops).
  - Contradicts the explicit core positioning: *"The fastest lightweight searchable engineering work journal."*

### 2. Flutter Desktop
* **Pros**:
  - High rendering performance via Impeller/Skia.
  - Single codebase in Dart across platforms.
* **Cons**:
  - Immature desktop ecosystem compared to web and Electron.
  - Severe deficiency in battle-tested rich text document editors matching ProseMirror's power.
  - Complex interop with native C/Rust libraries for embedded SQLite without significant glue code.
  - Alien UI feel on Windows without custom styling.

### 3. Native C++ / Qt or C# / WPF / WinUI 3
* **Pros**:
  - Near-zero runtime overhead; maximum native performance.
* **Cons**:
  - High development friction for solo developer; slow iteration velocity.
  - Building modern rich-text editors with markdown shortcuts and live DOM-like block trees from scratch in C++/C# is prohibitively expensive.
  - WinUI 3 is strictly Windows-only, blocking future Linux compatibility.

### 4. Tauri 2.x (Rust + WebView2 / WebKitGTK)
* **Pros**:
  - Uses native OS webview (WebView2 on Windows, WebKitGTK on Linux), resulting in tiny installer sizes (~10–15 MB) and very low idle RAM (typically 40–80 MB).
  - High-performance Rust backend for secure, native filesystem access, atomic writes, and direct embedded SQLite with FTS5.
  - Native IPC communication with typed commands.
  - Preserves standard React + TypeScript frontend ecosystem for the rich-text editor (Tiptap).
  - Tauri 2.0 is officially stable, production-ready, and supports fine-grained security capability scopes.
* **Cons**:
  - Dependent on the host OS webview engine (WebView2 is pre-installed on modern Windows 10/11; WebKitGTK required on Linux).
  - Requires cross-language coordination (TypeScript frontend ↔ Rust backend) via IPC serialization.

## Decision
We choose **Tauri 2.x (latest stable)** with a **Rust native core** and a **React / TypeScript / Vite frontend**.

## Consequences

### Positive
- Delivers on the primary product requirement of an ultra-lightweight desktop journal (< 90 MB idle RAM, < 800 ms cold start).
- Native Rust engine handles heavy I/O operations (SQLite FTS5 querying, atomic file writes, backup zip archives) off the JavaScript UI thread.
- Frontend retains access to the mature web editor ecosystem (Tiptap / ProseMirror).
- Zero licensing costs (MIT / Apache 2.0).

### Negative / Trade-offs
- Developers must maintain both Rust and TypeScript toolchains.
- Testing requires testing both Rust native units (`cargo test`) and frontend components (`vitest` / `playwright`).
- WebView2 version differences on legacy Windows machines must be handled gracefully (though modern Windows 10/11 ships Evergreen WebView2).

## Reversibility
Medium-Low. Switching away from Tauri to Electron would preserve the React frontend and Tiptap editor but would require rewriting the Rust native backend (SQLite, file I/O) in Node.js C++ native addons. Switching to Flutter would require a total rewrite.
