use serde::Serialize;

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
}
