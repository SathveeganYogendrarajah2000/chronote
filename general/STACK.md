# Chronote Technology Stack & Toolchain

## 1. Core Technology Inventory

Chronote prioritizes **stable, boring, and high-performance** technologies. Novel, experimental, or unmaintained libraries are strictly avoided.

| Layer / Responsibility | Technology | Target Version | License | Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop Shell** | Tauri | `2.x` (Latest Stable) | MIT / Apache-2.0 | Ultra-low idle RAM (< 90 MB), fast startup (< 800 ms), tiny binary footprint (~15 MB). |
| **Native Core Engine** | Rust | `1.80+` (2021 Edition) | MIT / Apache-2.0 | Memory safety, native filesystem I/O, embedded SQLite FTS5, atomic write guarantees. |
| **Frontend Framework** | React | `19.x` (Stable) | MIT | Declarative UI, mature component ecosystem, seamless integration with Tiptap editor. |
| **Language (Frontend)** | TypeScript | `5.6+` | Apache-2.0 | Strict compile-time safety, zero-any policy, exact optional property types. |
| **Build & Dev Server** | Vite | `6.x` | MIT | Instant HMR, fast builds, native ES modules. |
| **Editor Subsystem** | Tiptap / ProseMirror | `3.x` | MIT | Battle-tested structured document model, custom Markdown input rules, extensible node views. |
| **Database & Search** | SQLite 3 + FTS5 | Embedded (`rusqlite`) | Public Domain | Zero-daemon in-process database, sub-30 ms full-text search, trigram tokenization for code. |
| **State Management** | Zustand | `5.x` | MIT | Lightweight (~1.5 KB), zero-boilerplate, clean decoupling from React components. |
| **Schema Validation** | Zod | `3.x` | MIT | Runtime domain validation for IPC inputs and persisted JSON documents. |
| **Code Syntax Highlighting** | Lowlight / Shiki | Latest Stable | MIT | High-contrast, developer-friendly highlighting for 20+ engineering languages. |
| **DOCX Exporter** | `docx` | `8.x` | MIT | Pure TypeScript OpenXML Word document generation with native code table styling. |
| **Unit Test Runner** | Vitest | `2.x` | MIT | Fast, native ESM/TypeScript testing sharing Vite configuration. |
| **End-to-End Testing** | Playwright | `1.x` | Apache-2.0 | Robust automation for Tauri webview testing. |
| **Code Formatting** | Prettier & `rustfmt` | Latest Stable | MIT / Apache-2.0 | Deterministic formatting across TypeScript and Rust. |
| **Static Linting** | ESLint & Clippy | Latest Stable | MIT / Apache-2.0 | Zero-warning policy for frontend and native code. |
| **Package Manager** | `pnpm` | `9.x` | MIT | Fast, deterministic, disk-efficient dependency resolution. |

---

## 2. Package Manager & Environment Discipline

### 2.1 Why `pnpm`?
1. **Deterministic Lockfile:** `pnpm-lock.yaml` ensures identical builds across machines.
2. **Content-Addressable Storage:** Drastically reduces disk space usage across development branches.
3. **Strict Dependency Tree:** Prevents accidental usage of phantom dependencies that are not declared in `package.json`.
4. **Tauri 2.x Compatibility:** Verified full compatibility with Tauri CLI commands.

### 2.2 Version Pinning & Upgrade Policy
- In `package.json`, dependencies are pinned with explicit minor/patch versions (`~` or exact) to avoid unexpected breaking changes during automated CI builds.
- Upgrades are reviewed in dedicated dependency update pull requests, accompanied by automated regression test runs.
- **Forbidden:** No packages in `alpha`, `beta`, `rc` (release candidate), or `nightly` status may be introduced into core production dependencies.
