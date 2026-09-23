// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    std::panic::set_hook(Box::new(|info| {
        let msg = format!("Chronote fatal error:\n{info}");
        eprintln!("{msg}");
        if let Some(appdata) = std::env::var_os("LOCALAPPDATA") {
            let log_dir = std::path::PathBuf::from(appdata).join("chronote");
            let _ = std::fs::create_dir_all(&log_dir);
            let _ = std::fs::write(log_dir.join("crash.log"), &msg);
        }
    }));

    chronote_lib::run();
}
