import * as fs from "fs";
import * as path from "path";

interface GeneratorOptions {
  outDir: string;
  notesCount: number;
  daysCount: number;
  codeBlocksRatio: number;
}

const SAMPLE_TAGS = [
  "backend",
  "frontend",
  "database",
  "performance",
  "security",
  "devops",
  "aws",
  "docker",
  "rust",
  "typescript",
  "react",
  "architecture",
  "sqlite",
  "auth",
  "testing",
  "api",
  "graphql",
  "redis",
  "ci-cd",
  "monitoring",
];

const CODE_TEMPLATES: { lang: string; title: string; code: string }[] = [
  {
    lang: "typescript",
    title: "Fast LRU Cache Implementation",
    code: `class LRUCache<K, V> {
  private capacity: number;
  private map = new Map<K, V>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  set(key: K, val: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.capacity) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) this.map.delete(oldestKey);
    }
    this.map.set(key, val);
  }
}`,
  },
  {
    lang: "rust",
    title: "Atomic Flush Helper",
    code: `use std::fs::File;
use std::io::{Write, Result};
use std::path::Path;

pub fn write_atomic_buffer(target: &Path, data: &[u8]) -> Result<()> {
    let tmp = target.with_extension("tmp");
    let mut file = File::create(&tmp)?;
    file.write_all(data)?;
    file.sync_all()?;
    std::fs::rename(tmp, target)?;
    Ok(())
}`,
  },
  {
    lang: "sql",
    title: "FTS5 Query Optimization",
    code: `SELECT doc.title, fts.block_id, bm25(fts_blocks) as rank
FROM fts_blocks fts
JOIN documents doc ON doc.id = fts.document_id
WHERE fts_blocks MATCH 'indexing AND latency'
ORDER BY rank
LIMIT 50;`,
  },
  {
    lang: "python",
    title: "Async Event Dispatcher",
    code: `import asyncio
from typing import Callable, Dict, List

class EventHub:
    def __init__(self):
        self._handlers: Dict[str, List[Callable]] = {}

    def subscribe(self, topic: str, handler: Callable):
        self._handlers.setdefault(topic, []).append(handler)

    async def emit(self, topic: str, payload: dict):
        tasks = [h(payload) for h in self._handlers.get(topic, [])]
        if tasks:
            await asyncio.gather(*tasks)`,
  },
  {
    lang: "bash",
    title: "Deployment & Verification Pipeline",
    code: `#!/usr/bin/env bash
set -euo pipefail

echo "==> Verifying zero lingering background processes"
pgrep -f "chronote-native" || echo "All clean."
pnpm run test
cargo test --release`,
  },
];

function generateId(prefix: string): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let randomStr = "";
  for (let i = 0; i < 20; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${randomStr}`;
}

function parseArgs(): GeneratorOptions {
  const args = process.argv.slice(2);
  const options: GeneratorOptions = {
    outDir: path.resolve(process.cwd(), "benchmark-workspace"),
    notesCount: 500,
    daysCount: 60,
    codeBlocksRatio: 0.8,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--out" && args[i + 1]) {
      options.outDir = path.resolve(process.cwd(), args[++i]!);
    } else if (arg === "--notes" && args[i + 1]) {
      options.notesCount = parseInt(args[++i]!, 10);
    } else if (arg === "--days" && args[i + 1]) {
      options.daysCount = parseInt(args[++i]!, 10);
    } else if (arg === "--ratio" && args[i + 1]) {
      options.codeBlocksRatio = parseFloat(args[++i]!);
    }
  }

  return options;
}

export function generateSyntheticWorkspace(options: GeneratorOptions): void {
  const startTime = Date.now();
  const { outDir, notesCount, daysCount } = options;

  console.log(`Generating synthetic Chronote workspace at: ${outDir}`);
  console.log(`- General Notes: ${notesCount}`);
  console.log(`- DSM Timeline Days: ${daysCount}`);

  // Create directories
  const notesDir = path.join(outDir, "notes");
  const assetsImagesDir = path.join(outDir, "assets", "images");
  const assetsFilesDir = path.join(outDir, "assets", "files");
  const chronoteDir = path.join(outDir, ".chronote");

  fs.mkdirSync(notesDir, { recursive: true });
  fs.mkdirSync(assetsImagesDir, { recursive: true });
  fs.mkdirSync(assetsFilesDir, { recursive: true });
  fs.mkdirSync(chronoteDir, { recursive: true });

  // 1. workspace.json
  const workspaceId = generateId("ws");
  const workspace = {
    id: workspaceId,
    schemaVersion: 1,
    name: `Synthetic Benchmark (${notesCount} Notes)`,
    path: outDir,
    createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      editorFontSize: 15,
      editorLineHeight: 1.6,
      theme: "dark",
      dsmSortOrder: "desc",
      autosaveIntervalMs: 800,
    },
  };
  fs.writeFileSync(
    path.join(outDir, "workspace.json"),
    JSON.stringify(workspace, null, 2),
    "utf8"
  );

  // 2. notes/dsm.json
  const dsmEntries = [];
  const now = Date.now();
  let totalDsmBlocks = 0;

  for (let day = 0; day < daysCount; day++) {
    const dateObj = new Date(now - day * 86400000);
    const dateStr = dateObj.toISOString().split("T")[0]!;
    const entryId = generateId("entry");
    const entryTags = [
      SAMPLE_TAGS[day % SAMPLE_TAGS.length]!,
      SAMPLE_TAGS[(day + 3) % SAMPLE_TAGS.length]!,
    ];

    const template = CODE_TEMPLATES[day % CODE_TEMPLATES.length]!;
    const entryBlocks: any[] = [
      {
        type: "paragraph",
        attrs: { id: generateId("blk") },
        content: [
          {
            type: "text",
            text: `Daily engineering stand-up journal entry for ${dateStr}. Refactored core modules and profiled database query latency.`,
          },
        ],
      },
      {
        type: "taskList",
        attrs: { id: generateId("blk") },
        content: [
          {
            type: "taskItem",
            attrs: { checked: true, id: generateId("blk") },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: `Verify test coverage for #${entryTags[0]}` }],
              },
            ],
          },
          {
            type: "taskItem",
            attrs: { checked: day % 2 === 0, id: generateId("blk") },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: `Benchmark ${template.title} performance` }],
              },
            ],
          },
        ],
      },
      {
        type: "codeBlock",
        attrs: {
          id: generateId("blk"),
          language: template.lang,
          caption: `${template.title} snippet (${dateStr})`,
        },
        content: [{ type: "text", text: template.code }],
      },
    ];

    totalDsmBlocks += entryBlocks.length;

    dsmEntries.push({
      id: entryId,
      date: dateStr,
      tags: entryTags,
      collapsed: day > 7,
      content: {
        type: "doc",
        content: entryBlocks,
      },
      createdAt: new Date(dateObj.getTime() + 32400000).toISOString(),
      updatedAt: new Date(dateObj.getTime() + 61200000).toISOString(),
    });
  }

  const dsmDoc = {
    id: generateId("dsm_doc"),
    schemaVersion: 1,
    title: "Daily Stand-up Journal",
    createdAt: new Date(now - daysCount * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    entries: dsmEntries,
  };

  fs.writeFileSync(
    path.join(notesDir, "dsm.json"),
    JSON.stringify(dsmDoc, null, 2),
    "utf8"
  );

  // 3. notes/not_*.json (General notes)
  let totalGeneralBlocks = 0;
  let totalCodeBlocks = 0;

  for (let i = 0; i < notesCount; i++) {
    const noteId = generateId("not");
    const template = CODE_TEMPLATES[i % CODE_TEMPLATES.length]!;
    const tags = [
      SAMPLE_TAGS[i % SAMPLE_TAGS.length]!,
      SAMPLE_TAGS[(i * 3) % SAMPLE_TAGS.length]!,
      SAMPLE_TAGS[(i * 7) % SAMPLE_TAGS.length]!,
    ];

    const noteBlocks: any[] = [
      {
        type: "heading",
        attrs: { level: 1, id: generateId("blk") },
        content: [{ type: "text", text: `Engineering Note #${i + 1}: ${template.title}` }],
      },
      {
        type: "paragraph",
        attrs: { id: generateId("blk") },
        content: [
          {
            type: "text",
            text: `High performance implementation notes and architecture decisions regarding ${tags.join(", ")}. Investigated bottlenecks and established sub-millisecond execution guarantees.`,
          },
        ],
      },
      {
        type: "codeBlock",
        attrs: {
          id: generateId("blk"),
          language: template.lang,
          caption: `${template.title} Production Architecture`,
        },
        content: [{ type: "text", text: template.code }],
      },
      {
        type: "blockquote",
        attrs: { id: generateId("blk") },
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `Key takeaway: Keep execution local-first, memory-budgeted under 90 MB, and cold startup latency strictly under 800 ms.`,
              },
            ],
          },
        ],
      },
    ];

    totalGeneralBlocks += noteBlocks.length;
    totalCodeBlocks += 1;

    const note = {
      id: noteId,
      schemaVersion: 1,
      title: `Engineering Note #${i + 1}: ${template.title}`,
      tags,
      pinned: i < 3,
      content: {
        type: "doc",
        content: noteBlocks,
      },
      createdAt: new Date(now - (notesCount - i) * 3600000).toISOString(),
      updatedAt: new Date(now - (notesCount - i) * 1800000).toISOString(),
    };

    fs.writeFileSync(
      path.join(notesDir, `${noteId}.json`),
      JSON.stringify(note, null, 2),
      "utf8"
    );

    if ((i + 1) % 1000 === 0 || i + 1 === notesCount) {
      console.log(`Generated ${i + 1}/${notesCount} notes...`);
    }
  }

  // Create .gitignore and .stignore
  fs.writeFileSync(path.join(outDir, ".gitignore"), ".chronote/\n*.tmp\n", "utf8");
  fs.writeFileSync(path.join(outDir, ".stignore"), "(?d).chronote\n(?d)*.tmp\n", "utf8");

  const durationMs = Date.now() - startTime;
  console.log(`\nSynthetic workspace generation finished in ${durationMs} ms!`);
  console.log(`- Total Notes: ${notesCount + 1} (including DSM)`);
  console.log(`- Total Blocks: ${totalDsmBlocks + totalGeneralBlocks}`);
  console.log(`- Total Code Blocks: ${totalCodeBlocks + daysCount}`);
  console.log(`- Output Directory: ${outDir}\n`);
}

if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("generate_test_workspace")) {
  const opts = parseArgs();
  generateSyntheticWorkspace(opts);
}
