use std::path::PathBuf;
use serde::Serialize;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub description: String,
}

#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        name: "Chronote".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        description: "Your work. Remembered. Lightweight, local-first desktop engineering notebook.".into(),
    }
}

#[tauri::command]
pub fn ping() -> String {
    "pong".into()
}

pub fn decode_uri(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' {
            let h1 = chars.next();
            let h2 = chars.next();
            if let (Some(h1), Some(h2)) = (h1, h2) {
                if let Ok(byte) = u8::from_str_radix(&format!("{}{}", h1, h2), 16) {
                    result.push(byte as char);
                    continue;
                } else {
                    result.push('%');
                    result.push(h1);
                    result.push(h2);
                    continue;
                }
            }
        }
        result.push(c);
    }
    result
}

pub fn resolve_local_path(raw: &str, state: Option<&State<'_, AppState>>) -> Option<PathBuf> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    let decoded = if let Some(stripped) = trimmed.strip_prefix("http://asset.localhost/") {
        decode_uri(stripped)
    } else if let Some(stripped) = trimmed.strip_prefix("https://asset.localhost/") {
        decode_uri(stripped)
    } else if let Some(stripped) = trimmed.strip_prefix("asset://localhost/") {
        decode_uri(stripped)
    } else {
        trimmed.to_string()
    };

    #[cfg(target_os = "windows")]
    let cleaned = if decoded.starts_with('/') && decoded.chars().nth(2) == Some(':') {
        decoded[1..].to_string()
    } else {
        decoded
    };

    #[cfg(not(target_os = "windows"))]
    let cleaned = decoded;

    let p = PathBuf::from(&cleaned);
    if p.is_absolute() && p.exists() {
        return Some(p);
    }

    // Try resolving against active workspace root
    if let Some(st) = state {
        if let Ok(lock) = st.context.lock() {
            if let Some(ref ctx) = *lock {
                let candidate = ctx.root.join(&cleaned);
                if candidate.exists() {
                    return Some(candidate);
                }
                let asset_candidate = ctx.root.join("assets").join(&cleaned);
                if asset_candidate.exists() {
                    return Some(asset_candidate);
                }
            }
        }
    }

    if p.exists() {
        Some(p)
    } else {
        None
    }
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.contains("asset.localhost") || trimmed.contains("localhost:") {
        return Err("Local asset and development URLs cannot be opened in external browser.".to_string());
    }
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") && !trimmed.starts_with("mailto:") {
        return Err("Invalid URL protocol. Only http, https, and mailto URLs are allowed.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", trimmed])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn reveal_in_explorer(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let resolved = resolve_local_path(&path, Some(&state))
        .ok_or_else(|| format!("Target file or folder not found: {}", path))?;

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut cmd = std::process::Command::new("explorer");
        if resolved.is_file() {
            cmd.arg(format!("/select,{}", resolved.display()));
        } else {
            cmd.arg(resolved.display().to_string());
        }
        cmd.creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        if resolved.is_file() {
            std::process::Command::new("open")
                .args(["-R", &resolved.to_string_lossy()])
                .spawn()
                .map_err(|e| format!("Failed to reveal file: {}", e))?;
        } else {
            std::process::Command::new("open")
                .arg(&resolved)
                .spawn()
                .map_err(|e| format!("Failed to reveal file: {}", e))?;
        }
    }

    #[cfg(target_os = "linux")]
    {
        let target = if resolved.is_file() {
            resolved.parent().unwrap_or(&resolved)
        } else {
            &resolved
        };
        std::process::Command::new("xdg-open")
            .arg(target)
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn open_file(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let resolved = resolve_local_path(&path, Some(&state))
        .ok_or_else(|| format!("Target file not found: {}", path))?;

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &resolved.to_string_lossy()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&resolved)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&resolved)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_app_info() {
        let info = get_app_info();
        assert_eq!(info.name, "Chronote");
        assert!(!info.version.is_empty());
        assert!(info.description.contains("Lightweight"));
    }

    #[test]
    fn test_ping() {
        assert_eq!(ping(), "pong");
    }

    #[test]
    fn test_decode_uri() {
        assert_eq!(decode_uri("C%3A%2Fworkspace%2Ffile%20name.pdf"), "C:/workspace/file name.pdf");
        assert_eq!(decode_uri("hello%20world"), "hello world");
    }

    #[test]
    fn test_open_external_url_blocks_localhost() {
        assert!(open_external_url("http://asset.localhost/foo.png".to_string()).is_err());
        assert!(open_external_url("http://localhost:1420".to_string()).is_err());
    }
}
