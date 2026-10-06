pub mod commands;
pub mod database;
pub mod search;
pub mod state;
pub mod storage;

use commands::asset::{get_asset_path, pick_asset_file, save_asset_binary};
use commands::conflict::{get_sync_conflicts, resolve_conflict, resolve_3way_conflict};
use commands::export::{export_workspace_backup, pick_export_file_path, save_exported_file};
use commands::note::{
    delete_binned_note_permanently, delete_general_note, empty_bin, list_binned_notes,
    list_general_notes, move_note_to_bin, read_courses_document, read_dsm_document,
    read_general_note, restore_note_from_bin, save_courses_document, save_dsm_document,
    save_general_note,
};
use commands::performance::get_performance_metrics;
use commands::search::{get_backlinks, get_backlinks_graph, get_resources, search_workspace};
use commands::system::{get_app_info, open_external_url, open_file, ping, reveal_in_explorer};
use commands::workspace::{
    create_workspace, get_active_workspace, open_workspace, pick_workspace_directory,
    read_cloud_sync_config, rebuild_index, save_cloud_sync_config, save_workspace_settings,
};
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                _app.handle().plugin(
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
            open_external_url,
            open_file,
            reveal_in_explorer,
            pick_asset_file,
            save_asset_binary,
            get_asset_path,
            pick_workspace_directory,
            create_workspace,
            open_workspace,
            get_active_workspace,
            save_workspace_settings,
            rebuild_index,
            read_dsm_document,
            save_dsm_document,
            read_courses_document,
            save_courses_document,
            read_general_note,
            save_general_note,
            list_general_notes,
            delete_general_note,
            move_note_to_bin,
            restore_note_from_bin,
            list_binned_notes,
            delete_binned_note_permanently,
            empty_bin,
            search_workspace,
            get_resources,
            get_backlinks,
            get_backlinks_graph,
            pick_export_file_path,
            save_exported_file,
            export_workspace_backup,
            get_performance_metrics,
            get_sync_conflicts,
            resolve_conflict,
            resolve_3way_conflict,
            save_cloud_sync_config,
            read_cloud_sync_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
