# Chronote Security Specification

## 1. Security Philosophy

Chronote is designed to store proprietary corporate and personal engineering notes. As a desktop application, security is built around the **principle of least privilege**, strict filesystem sandboxing, zero external network communication, and defensive handling of untrusted inputs.

---

## 2. Tauri 2.x Capability Sandbox and Permissions

In Tauri 2.x, the frontend webview has **zero native permissions by default**. All operating system interactions must be explicitly declared in capabilities configuration files (`src-tauri/capabilities/default.json`).

### 2.1 Enforced Capability Scope
- **Filesystem Access:** Restricted exclusively to the selected workspace directory and temporary cache directories. The frontend webview cannot read or write to arbitrary paths on the user's hard drive (e.g. `C:\Windows` or user home folders).
- **Process Execution:** Tauri `shell:execute` is **strictly forbidden**. Chronote does not spawn arbitrary system processes or run shell scripts from within the application.
- **Network Access:** Tauri `http` plugin permissions are **disabled**. The frontend cannot issue arbitrary outbound HTTP requests.

---

## 3. Filesystem Sandboxing & Path Traversal Defense

All file operations in the Rust native core pass through a path validator to prevent path traversal (`../`) vulnerabilities.

```rust
// Rust Core Path Guard
pub fn validate_workspace_path(
    workspace_root: &Path, 
    requested_subpath: &Path
) -> Result<PathBuf, SecurityError> {
    let canonical_root = workspace_root.canonicalize()
        .map_err(|_| SecurityError::InvalidWorkspace)?;
    
    let target = canonical_root.join(requested_subpath);
    let canonical_target = target.canonicalize()
        .map_err(|_| SecurityError::FileNotFound)?;

    if !canonical_target.starts_with(&canonical_root) {
        return Err(SecurityError::PathTraversalDetected);
    }

    Ok(canonical_target)
}
```

---

## 4. External URL & Link Handling

Notes frequently contain links to external documentation, GitHub pull requests, Jira tickets, and Stack Overflow discussions.

### 4.1 Strict Protocol Allowlist
Only the following URI schemes are allowed:
- `https://`
- `http://`
- `mailto:`

Dangerous URI schemes (e.g. `file://`, `javascript:`, `data:`, `ms-appx:`, `powershell:`) are blocked and stripped.

### 4.2 External Link Confirmation Dialog
Clicking an external link does not execute silently in the webview. Instead:
1. The frontend intercepts the click event.
2. The user is presented with a confirmation modal:
   ```
   Open External Link?
   Destination: https://github.com/org/repo/pull/123
   [Cancel] [Open in Browser]
   ```
3. Upon confirmation, the URL is opened using the operating system's default web browser via Tauri's safe shell opener (`open::that`).

---

## 5. Input Sanitization (Pasted Markdown & HTML)

When engineers paste text, screenshots, or formatted snippets from external websites:
1. **DOM Sanitization:** All pasted rich HTML passes through `DOMPurify` before being fed to Tiptap's parser.
2. **Script Execution Stripping:** `<script>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`, `<svg>` with inline script attributes (`onload`, `onerror`) are completely stripped.
3. **Attribute Whitelist:** Only semantic formatting attributes (`href`, `src`, `class`, `title`, `alt`) are retained.

---

## 6. Attachment Safety & Execution Denial

Chronote allows attaching reference files (PDFs, images, logs).

### 6.1 Dangerous Extension Blocklist
The following executable extensions cannot be run or launched directly from Chronote:
`.exe`, `.bat`, `.cmd`, `.ps1`, `.vbs`, `.js`, `.wsf`, `.scr`, `.msi`, `.jar`, `.sh`.

When a user clicks an attached file in Chronote, the application offers only:
- **Reveal in File Explorer:** Opens the OS file manager focused on the file in `assets/files/`.
- **Export to Directory:** Copies the file to a chosen location.
Chronote **never** executes binaries on behalf of the user.

---

## 7. IPC Boundary Validation

All communication between the React webview and the Rust native core crosses the Tauri IPC boundary:
1. **Frontend Validation:** Arguments are validated with Zod schemas before IPC invocation.
2. **Rust Deserialization:** Arguments are parsed into strongly typed Serde structs with strict field requirements. Extra or unexpected fields are rejected.
3. **Error Isolation:** Rust returns structured `Result<T, AppError>`. Technical stack traces are logged locally to a debug log file, but never leaked directly into untrusted presentation state.

---

## 8. Privacy & Zero-Telemetry Guarantee

Chronote is an offline-first, private workstation application:
- **Zero Telemetry:** No analytics SDKs (no Google Analytics, Sentry, Mixpanel, or PostHog).
- **Zero Phoning Home:** No background license validation checks or update beacons in Phase 1.
- **Local Data Only:** No note text, queries, or assets leave the user's local machine.
