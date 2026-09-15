# Chronote Licensing & Dependency Review

## 1. Project License

Chronote is licensed under the **MIT License**.

- **Copyright:** (c) 2026 Sathveegan Yogendrarajah
- **License Text:** See root [LICENSE](../LICENSE) file.
- **Intent:** Unrestricted, open-source software permitting free personal and commercial use, modification, distribution, and private development.

---

## 2. Dependency Licensing Policy

To safeguard the project against intellectual property taint, unexpected commercial restrictions, or viral copyleft obligations, all third-party dependencies (both `npm` packages and `cargo` crates) must strictly adhere to the following license compatibility matrix:

### 2.1 Permitted Licenses (Green Tier)
The following permissive licenses are approved for inclusion in Chronote:
- **MIT License** (e.g. React, Tiptap, Zustand, Vite, docx)
- **Apache License 2.0** (e.g. Rust standard ecosystem, TypeScript, Playwright)
- **BSD 2-Clause and BSD 3-Clause**
- **ISC License**
- **Public Domain / CC0 / Unlicense** (e.g. SQLite)

### 2.2 Strictly Forbidden Licenses (Red Tier)
The following licenses are **strictly forbidden** in runtime dependencies or bundled application code:
- **GNU General Public License (GPL v2 / GPL v3)**
- **GNU Affero General Public License (AGPL v3)**
- **Server Side Public License (SSPL)**
- **Business Source License (BSL / BUSL)**
- **Commons Clause** and non-commercial restrictions (e.g. CC-BY-NC)

*Rationale:* Including GPL or AGPL libraries would impose viral copyleft obligations on the entire application codebase. Commercial restrictions contradict Chronote's commitment to true open source.

### 2.3 Conditional Licenses (Yellow Tier)
- **Mozilla Public License (MPL 2.0)** and **GNU Lesser General Public License (LGPL)**:
  - May only be used if dynamically linked or isolated in external tools that do not affect the main binary distribution under MIT terms.
  - Requires explicit architectural review and an ADR before adoption.

---

## 3. Automated License Auditing

To ensure no prohibited licenses are introduced during ongoing AI-agent or human development:

```bash
# Audit npm dependencies
pnpm dlx license-checker --production --onlyAllow "MIT;Apache-2.0;BSD-3-Clause;BSD-2-Clause;ISC;CC0-1.0;Unlicense"

# Audit Rust cargo dependencies
cargo install cargo-deny
cargo deny check licenses
```
Both checks are integrated into Chronote's automated CI validation pipelines.
