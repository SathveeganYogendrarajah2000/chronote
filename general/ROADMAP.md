# Chronote Project Roadmap

## 1. Overview & Strategy

Chronote follows a phased, milestone-driven development strategy designed for high velocity, stability, and zero feature creep.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Phase 0: Architecture & Documentation Foundation (Current)                │
├────────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Windows MVP (The Fastest Lightweight Engineering Work Journal)    │
├────────────────────────────────────────────────────────────────────────────┤
│ Phase 2: Stabilization, Real-World Hardening & Installer Distribution      │
├────────────────────────────────────────────────────────────────────────────┤
│ Phase 3: Cloud Integrations, Conflict Merging & Advanced Navigation        │
├────────────────────────────────────────────────────────────────────────────┤
│ Phase 4: Linux Desktop Compatibility (WebKitGTK, AppImage, Deb)           │
├────────────────────────────────────────────────────────────────────────────┤
│ Phase 5: Optional Advanced Extensions (Local AI via Ollama, Encryption)   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granular Phase Breakdown

### Phase 0: Architecture & Documentation Foundation (Status: Complete)
- [x] Product vision, persona definition, and user workflows.
- [x] Canonical internal document model decision (Tiptap / ProseMirror JSON).
- [x] Physical storage architecture and atomic write protocol.
- [x] SQLite FTS5 search engine design.
- [x] Complete specifications and Architectural Decision Records (`general/`).

---

### Phase 1: Windows MVP (Target Delivery)
*Goal: A fully functional, blazing-fast, local-first desktop application for Windows.*

- **Milestone 1.1: Project Scaffolding & Native Shell**
  - Initialize Tauri 2.x with Rust backend and React 19 / TypeScript / Vite frontend.
  - Establish window controls, custom dark/light theme tokens, and base layout.
- **Milestone 1.2: Workspace & Storage Engine**
  - Implement workspace creator and folder picker.
  - Implement atomic file persistence (`.tmp` -> `fsync` -> atomic rename) in Rust.
  - Implement SQLite database initialization and FTS5 virtual tables in `.chronote/index.db`.
- **Milestone 1.3: Continuous Daily Stand-up (DSM) Journal**
  - Build the continuous timeline view rendering sequential date entries.
  - Implement entry collapsing/expanding with auto-derived summaries.
  - Implement entry-level tag management and date picker navigation.
- **Milestone 1.4: General Notes Subsystem**
  - [x] Standalone note creation, renaming, pinning, and deletion.
  - [x] Multi-document tab bar with DSM pinning and session restore.
- **Milestone 1.5: Rich-Text Editor & Code Blocks**
  - [x] Tiptap 3.x integration with Markdown InputRules (`# `, `- `, `1. `, `> `, ````, `---`, etc.).
  - [x] First-class code blocks with language selector, syntax highlighting, and copy button.
  - [x] Internal note linking (`[[Note Title]]`) with autocomplete and stable ID resolution.
- **Milestone 1.6: Instant Search & Resource Browser**
  - [x] Implement search DSL parser (`tag:`, `type:`, `date:`, `after:`, `before:`).
  - [x] SQLite FTS5 query runner with BM25 ranking and highlighted snippet generation (< 50 ms).
  - [x] Resource Browser index (Code, Images, Links, Attachments, Backlinks).
- **Milestone 1.7: Export Pipeline**
  - [x] Export to standard GitHub Flavored Markdown (`.md`).
  - [x] Export to Microsoft Word (`.docx`).
  - [x] Export to PDF (`.pdf`).
  - [x] One-click full workspace `.zip` backup.
- **Milestone 1.8: Ergonomic Navigation & Adaptive Workspace Scaling (Delivered in v0.1.4)**
  - [x] Application-wide Zoom In/Out (`Ctrl+=`, `Ctrl+-`, `Ctrl+0`, `Ctrl+Wheel`) with viewport dimension compensation (`calc(100vw / var(--app-zoom))`), on-screen HUD overlay, and Tauri webview integration.
  - [x] Multi-Tag Search & Filter across Side Navigation and DSM timeline with `ALL` (AND) / `ANY` (OR) match mode toggling.
  - [x] Automated Table of Contents with live cursor context tracking across General Notes and DSM entries, outline search, and exact ProseMirror text selection navigation upon click.
  - [x] Resizable Sidebars for Left Navigation Sidebar and Right Resource Inspector with interactive draggable handles, min/max bounds, double-click reset, and responsive full-width child filling.
- **Milestone 1.9: Media Ergonomics & Tagging Precision (Delivered in v0.1.5)**
  - [x] Interactive Image Resizing with edge/corner drag handles, live dimension badge indicator, quick presets (25%, 50%, 75%, 100%), alignment controls (left, center, right), and editable captions.
  - [x] User-friendly TagPicker popover with workspace tag suggestions, usage frequency counts, keyboard navigation, and instant creation across General Notes and Daily Stand-up entries.
  - [x] Outline Heading Row Navigation precision fix: unique dynamic block IDs and exact document ordinal index targeting across all heading levels.

---

### Phase 2: Stabilization, Hardening & Distribution
*Goal: Real-world stress testing, benchmark validation, and smooth installer packaging.*

- [x] Large workspace stress testing (5,000+ notes, 20,000+ code blocks).
- [x] Startup latency profiling to guarantee cold boot < 800 ms and idle RAM < 90 MB.
- [x] Windows NSIS / MSI installer generation via Tauri GitHub Actions workflow.
- [x] External sync conflict detection and user notification dialogs.

---

### Phase 3: Cloud Integrations & Advanced Navigation (Status: Complete)
*Goal: Seamless multi-device sync without requiring a Chronote-owned backend.*

- [x] Direct Google Drive and Microsoft OneDrive API adapters using user-provided OAuth tokens (with Sandbox mock mode).
- [x] Interactive 3-way conflict resolution wizard for concurrent offline edits.
- [x] Interactive backlinks graph and semantic visual connection explorer.

---

### Phase 4: Linux Desktop Compatibility
*Goal: First-class support for Linux developer workstations.*

- WebKitGTK compatibility audit and automated Linux CI builds.
- Packaging for Linux: AppImage, `.deb`, and Flatpak.
- Linux desktop shortcuts and system tray integration.

---

### Phase 5: Optional Advanced Extensions
*Goal: Powerful, strictly opt-in capabilities for power users.*

- Optional local AI intelligence provider via user's local Ollama instance (summaries, tag suggestions; zero cloud data transmission).
- Optional end-to-end AES-256-GCM encryption at rest for the workspace directory.

---

## 3. Explicit Non-Goals for Phase 1

The following features are **strictly out of scope** for Phase 1:
- ❌ Mobile apps (iOS / Android)
- ❌ Hosted web application / SaaS
- ❌ Cloud-hosted Chronote sync servers / accounts
- ❌ Real-time multi-user simultaneous editing (Google Docs style)
- ❌ Generative AI chat, vector databases, or cloud LLM calls
- ❌ Audio transcription / speech-to-text
- ❌ OCR text extraction from images
- ❌ Whiteboard drawing tools
- ❌ Calendar sync (Google Calendar / Outlook integration)
- ❌ Plugin marketplace
