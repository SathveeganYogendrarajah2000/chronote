# Chronote Development Rules & Engineering Standards

## 1. Core Engineering Discipline

Chronote is developed using an AI-augmented workflow in Google's Antigravity IDE. Because different AI coding agents and human developers will collaborate on this codebase over time, strict architectural boundaries, coding standards, and review guidelines must be maintained.

---

## 2. Non-Negotiable Architectural Rules

1. **Zero Business Logic in React Components:**
   - React components are strictly presentation layers.
   - Components MUST NOT parse domain formats (e.g. tag normalization, date arithmetic, search query parsing).
   - Components MUST NOT perform direct I/O, SQLite operations, or filesystem calls.
   - Components read state from Zustand stores and dispatch typed actions.
2. **Deterministic Unidirectional Flow:**
   - Presentation (React) → Application (Zustand Stores) → Domain (Pure TS Types & Rules) → Infrastructure (Tauri IPC Bridge) → Native Core (Rust).
3. **Atomic File Writes Only:**
   - Never write directly to a target note file (`std::fs::write("notes/foo.json")` is strictly prohibited).
   - All writes must use the atomic pipeline: Write to `.tmp` → `File::sync_all()` → Atomic rename.
4. **Authoritative vs. Disposable Data:**
   - `workspace.json`, `notes/*.json`, and `assets/*` are the **sole authoritative sources of truth**.
   - The SQLite database at `.chronote/index.db` is a **disposable index cache**. Never store unique state solely in SQLite that cannot be reconstructed from disk files.
5. **Stable Identity Strategy:**
   - Never use mutable titles or calendar dates as primary keys or link targets. Use immutable ULID/UUID identifiers.
6. **Zero External Network Dependencies:**
   - The application core must never require network access. No analytics, no telemetry, no mandatory cloud sync in Phase 1.

---

## 3. Technology Stack & Dependency Discipline

- **Package Manager:** `pnpm` (latest stable).
- **TypeScript:** Strict mode enabled (`"strict": true`, `"noImplicitAny": true`, `"exactOptionalPropertyTypes": true`).
- **Dependency Vetting:**
  - Choose **boring, stable, production-ready** libraries.
  - Do NOT install alpha, beta, release-candidate, or nightly dependencies unless formally justified in an ADR.
  - No framework novelty: evaluate bundle size, dependency tree, and maintenance history before adding any npm or cargo package.
  - Do NOT install CSS component libraries (no TailwindCSS, MUI, or Chakra). Use Vanilla CSS with CSS custom properties.

---

## 4. Coding Standards by Language

### 4.1 TypeScript & React Standards
- **File Naming:**
  - React Components: PascalCase (e.g. `DsmTimeline.tsx`, `CodeBlockView.tsx`).
  - Stores, Hooks, Utilities: camelCase (e.g. `useDsmStore.ts`, `tagNormalizer.ts`).
  - Types & Contracts: PascalCase or camelCase with `.types.ts` suffix (e.g. `document.types.ts`).
- **Pure Functions:** Domain logic must consist of pure, side-effect-free functions with 100% unit test coverage.
- **Error Handling:** Use typed result objects or explicit error classes rather than throwing generic strings.
- **Formatting & Linting:**
  - Formatter: `prettier --write`
  - Linter: `eslint . --ext .ts,.tsx` (Zero warnings policy).

### 4.2 Rust Native Standards
- **Idiomatic Rust:** Follow standard Rust API guidelines.
- **Error Handling:** Use `thiserror` for internal domain/I/O errors and map to a clean serializable enum for Tauri IPC responses. Never use `unwrap()` or `expect()` in production code paths.
- **Formatting & Linting:**
  - Formatter: `cargo fmt`
  - Linter: `cargo clippy --all-targets -- -D warnings`

---

## 5. Git & Version Control Conventions

- **Branching Strategy:**
  - `main`: Production-ready, stable codebase.
  - `feature/<name>`: New feature implementations.
  - `fix/<name>`: Bug fixes and performance patches.
- **Commit Messages:** Strictly follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
  - `feat: add collapsible preview to DSM date entries`
  - `fix(storage): ensure fsync completes before atomic rename`
  - `docs: add ADR-008 explaining Phase 1 AI policy`
  - `test: add unit tests for tag normalization rules`
  - `refactor: extract search query AST parser into domain module`

---

## 6. AI Coding Agent Operating Protocol (Antigravity IDE)

When an AI coding agent begins a development session in this repository, it MUST adhere to the following protocol:

1. **Step 1: Read [general/AI_CONTEXT.md](file:///e:/workspace/chronote/general/AI_CONTEXT.md) First.**
   - Do not propose changes or write code before reviewing the active mission, current status, and non-negotiable rules.
2. **Step 2: Check Existing Architecture & ADRs.**
   - Cross-reference decisions in [general/DECISIONS/](file:///e:/workspace/chronote/general/DECISIONS/) before introducing patterns, dependencies, or architectural alterations.
3. **Step 3: Preserve Integrity & Comments.**
   - Do not delete existing comments, docstrings, or architectural notes unless explicitly asked.
4. **Step 4: Keep Changes Focused & Incremental.**
   - Implement only the approved milestone task. Do not invent unprompted features or make sweeping refactors outside the task scope.
5. **Step 5: Verify Before Concluding.**
   - Run tests (`pnpm test`, `cargo test`) and linters (`eslint`, `cargo clippy`).
   - If changes alter domain structures or add ADRs, update [general/AI_CONTEXT.md](file:///e:/workspace/chronote/general/AI_CONTEXT.md) and [general/CHANGELOG.md](file:///e:/workspace/chronote/general/CHANGELOG.md).
