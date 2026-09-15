# Changelog

All notable changes to the **Chronote** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for [0.1.0] - Phase 1 Windows MVP
- Desktop application shell using Tauri 2.x and React 19.
- Local-first workspace initialization and folder management.
- Continuous Daily Stand-up (DSM) journal with collapsible date entries.
- General Notes system with standalone title-based documents.
- Tiptap 3.x rich-text editor with instant Markdown shortcut input rules.
- First-class code blocks with syntax highlighting, language selector, and copy button.
- Embedded SQLite FTS5 search engine supporting sub-50 ms queries across tags, dates, and code.
- Multi-document tab bar with DSM pinning and session restore.
- Resource browser categorizing Code, Images, Links, Attachments, and Backlinks.
- Atomic filesystem save pipeline (`.tmp` -> `fsync` -> rename).
- Document exporters for Markdown (`.md`), Microsoft Word (`.docx`), PDF (`.pdf`), and Zip backup.

---

## [0.0.0] - 2026-09-16

### Added
- **Documentation Foundation (Phase 0):**
  - Created operational context briefing for AI coding agents (`AI_CONTEXT.md`).
  - Defined product identity, user workflows, and Phase 1 scope (`PRODUCT_SPEC.md`).
  - Authored clean layered architecture with Tauri IPC contracts (`ARCHITECTURE.md`).
  - Defined TypeScript and Rust domain models, Zod validation schemas, and ID conventions (`DOMAIN_MODEL.md`).
  - Specified directory-based workspace storage model and atomic save algorithm (`STORAGE_FORMAT.md`).
  - Designed SQLite FTS5 search engine, query grammar, and ranking system (`SEARCH_SPEC.md`).
  - Specified rich-text editor behavior, Markdown input rules, and code block system (`EDITOR_SPEC.md`).
  - Created UX specifications, window layout, design tokens, and tab management (`UX_SPEC.md`).
  - Specified multi-target export pipelines for Markdown, DOCX, PDF, and Zip backups (`EXPORT_SPEC.md`).
  - Authored security policies, Tauri capability sandboxing, and path traversal defenses (`SECURITY.md`).
  - Established measurable lightweight performance budgets and benchmarking harnesses (`PERFORMANCE.md`).
  - Defined comprehensive testing strategy across unit, editor, persistence, and E2E tiers (`TESTING.md`).
  - Codified engineering standards, React/Rust boundaries, and AI agent protocols (`DEVELOPMENT_RULES.md`).
  - Published 5-phase project roadmap and Phase 1 non-goals (`ROADMAP.md`).
  - Created canonical terminology glossary (`GLOSSARY.md`).
  - Documented technology stack and dependency vetting (`STACK.md`).
  - Analyzed open-source licensing constraints (`LICENSE_NOTES.md`).
  - Cataloged technical open questions, trade-offs, and future spikes (`OPEN_QUESTIONS.md`).
  - Authored 8 Architectural Decision Records (`DECISIONS/ADR-001` through `ADR-008`).
