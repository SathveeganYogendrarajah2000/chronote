use serde::{Deserialize, Serialize};

pub fn default_section() -> String {
    "General".to_string()
}

pub fn default_note_sort_by() -> String {
    "title".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    pub editor_font_size: u32,
    pub editor_line_height: f64,
    pub theme: String,
    pub dsm_sort_order: String,
    pub autosave_interval_ms: u32,
    #[serde(default = "default_note_sort_by")]
    pub note_sort_by: String,
    #[serde(default)]
    pub pinned_sections: Vec<String>,
    #[serde(default)]
    pub custom_sections: Vec<String>,
}

impl Default for WorkspaceSettings {
    fn default() -> Self {
        Self {
            editor_font_size: 15,
            editor_line_height: 1.6,
            theme: "dark".to_string(),
            dsm_sort_order: "desc".to_string(),
            autosave_interval_ms: 800,
            note_sort_by: "title".to_string(),
            pinned_sections: Vec::new(),
            custom_sections: Vec::new(),
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
    #[serde(default = "default_section")]
    pub section: String,
    pub content: serde_json::Value,
    #[serde(default)]
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
    #[serde(default = "default_section")]
    pub section: String,
    #[serde(default)]
    pub pinned: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BinnedNoteRecord {
    pub id: String,
    pub title: String,
    pub tags: Vec<String>,
    pub deleted_at: String,
    pub expires_at: String,
    pub original_section: String,
    pub note: GeneralNote,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dsm_date: Option<String>,
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

fn default_topic_content() -> serde_json::Value {
    serde_json::json!({
        "type": "doc",
        "content": [{ "type": "paragraph" }]
    })
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LearningTopic {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: String,
    pub tags: Vec<String>,
    pub platform: Option<String>,
    pub url: Option<String>,
    pub author: Option<String>,
    pub status: Option<String>,
    pub progress: Option<u32>,
    pub completed_items: Option<u32>,
    pub total_items: Option<u32>,
    pub rating: Option<u32>,
    #[serde(default = "default_topic_content")]
    pub content: serde_json::Value,
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
