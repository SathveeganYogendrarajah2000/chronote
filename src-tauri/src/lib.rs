pub mod commands;
pub mod database;
pub mod search;
pub mod state;
pub mod storage;

use commands::note::{
    delete_general_note, list_general_notes, read_dsm_document, read_general_note,
    save_dsm_document, save_general_note,
};
use commands::search::{get_backlinks, get_resources, search_workspace};
use commands::system::{get_app_info, ping};
use commands::workspace::{
    create_workspace, get_active_workspace, open_workspace, pick_workspace_directory,
    rebuild_index, save_workspace_settings,
};
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            ping,
            pick_workspace_directory,
            create_workspace,
            open_workspace,
            get_active_workspace,
            save_workspace_settings,
            rebuild_index,
            read_dsm_document,
            save_dsm_document,
            read_general_note,
            save_general_note,
            list_general_notes,
            delete_general_note,
            search_workspace,
            get_resources,
            get_backlinks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
