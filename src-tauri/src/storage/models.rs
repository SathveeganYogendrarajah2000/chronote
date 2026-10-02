use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    pub editor_font_size: u32,
    pub editor_line_height: f64,
    pub theme: String,
    pub dsm_sort_order: String,
    pub autosave_interval_ms: u32,
}

impl Default for WorkspaceSettings {
    fn default() -> Self {
        Self {
            editor_font_size: 15,
            editor_line_height: 1.6,
            theme: "dark".to_string(),
            dsm_sort_order: "desc".to_string(),
            autosave_interval_ms: 800,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub schema_version: u32,
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub updated_at: String,
    pub settings: WorkspaceSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DsmDocument {
    pub id: String,
    pub schema_version: u32,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub entries: Vec<DsmEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DsmEntry {
    pub id: String,
    pub date: String,
    pub tags: Vec<String>,
    pub collapsed: bool,
    pub content: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GeneralNote {
    pub id: String,
    pub schema_version: u32,
    pub title: String,
    pub tags: Vec<String>,
    pub content: serde_json::Value,
    pub pinned: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NoteMetadata {
    pub id: String,
    pub title: String,
    pub tags: Vec<String>,
    pub pinned: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IndexStats {
    pub indexed_documents: usize,
    pub indexed_blocks: usize,
    pub indexed_tags: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LearningResource {
    pub id: String,
    pub topic_id: String,
    pub title: String,
    pub platform: String,
    pub url: String,
    pub author: String,
    pub status: String,
    pub progress: u32,
    pub completed_items: Option<u32>,
    pub total_items: Option<u32>,
    pub rating: Option<u32>,
    pub tags: Vec<String>,
    pub notes: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LearningTopic {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: String,
    pub tags: Vec<String>,
    pub notes: Option<serde_json::Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CoursesDocument {
    pub id: String,
    pub schema_version: u32,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub topics: Vec<LearningTopic>,
    pub resources: Vec<LearningResource>,
}

