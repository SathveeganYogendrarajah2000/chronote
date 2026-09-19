use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::Connection;

use crate::storage::models::Workspace;

pub struct WorkspaceContext {
    pub root: PathBuf,
    pub workspace: Workspace,
    pub db: Connection,
}

#[derive(Default)]
pub struct AppState {
    pub context: Mutex<Option<WorkspaceContext>>,
}
