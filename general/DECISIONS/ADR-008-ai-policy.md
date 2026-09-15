# ADR-008: AI Policy and Extension Point Strategy

## Status
Accepted

## Date
2026-09-16

## Context
Many modern productivity tools rush to integrate generative AI features (e.g. LLM chat, auto-summarization, vector databases, cloud embeddings, agent copilots) into their core architecture.

In early project phases, this introduces significant failure modes:
1. **Mandatory Third-Party Cloud Dependencies**: Requires API keys from OpenAI, Anthropic, or Google, violating the zero-cost and 100% offline local-first mandates.
2. **Data Privacy Risks**: Corporate engineers cannot risk pasting proprietary database schemas, internal AWS endpoints, or customer incident notes into an application that phones home to third-party AI models.
3. **Bloat and Fragility**: Bundling local LLM runtimes (e.g. llama.cpp, ONNX) balloons installer sizes by 2–4 GB and consumes excessive CPU/GPU memory, destroying the lightweight performance guarantee (< 90 MB RAM, < 800 ms cold start).
4. **Distraction from Core Utility**: Chronote’s primary value proposition is deterministic, blazing-fast authoring, indexing, tagging, and navigation ("Write → structure → tag → search → navigate → revisit").

## Problem
What is Chronote's policy regarding Artificial Intelligence features in Phase 1 and what architectural boundaries should be established to permit future, privacy-respecting AI capabilities without compromising the core product?

## Decision Drivers
1. **Local-First & Offline Guarantee**: Core functionality must remain 100% operational with zero internet connectivity and zero external accounts.
2. **Zero-Cost Development**: No mandatory paid subscriptions or API tokens.
3. **Lightweight Discipline**: No runtime bloat, no vector database engines, no background embedding workers.
4. **Data Sovereignty**: User notes must remain strictly local unless the user explicitly commands an external interaction in future phases.
5. **Architectural Cleanliness**: If AI is introduced later, it must plug into an optional extension interface rather than being woven into core domain entities.

## Decision

### Phase 1 Policy
**Artificial Intelligence is explicitly excluded from Phase 1 core functionality.**

The following capabilities are strictly **NOT** in Phase 1:
- No AI text generation, rephrasing, or autocompletion.
- No automated AI summaries of DSM entries (summaries are derived deterministically from the first paragraph).
- No vector embeddings, cosine similarity search, or vector database engines (Chroma, pgvector, LanceDB, Qdrant).
- No RAG (Retrieval-Augmented Generation) pipelines.
- No AI chat sidebars or LLM agent integrations.
- No external model API calls or background telemetry.

### Future Extension Architecture (Phase 5+)
If AI capabilities are introduced in future phases, they must strictly satisfy:
1. **Opt-in Only**: The core application must install and run with zero AI modules active by default.
2. **Local or User-Keyed**: Support either local inference (via user's own Ollama instance) or user-provided personal API keys.
3. **Decoupled Extension Service Interface**:
   ```typescript
   interface IntelligenceExtension {
     readonly id: string;
     readonly isAvailable: boolean;
     generateSummary?(text: string): Promise<string>;
     suggestTags?(content: string): Promise<string[]>;
   }
   ```
4. **No Core Dependency**: The application must never depend on an AI response to save, index, display, or search a note. SQLite FTS5 remains the permanent, authoritative search engine.

## Consequences

### Positive
- Chronote remains hyper-focused on executing the fastest, cleanest engineering note workflow.
- Complete data confidentiality for enterprise and sensitive developer environments.
- Zero infrastructure costs, zero API rate limits, zero vendor lock-in.
- Preserves the strict < 90 MB memory budget and sub-second startup speed.

### Negative / Trade-offs
- Users expecting auto-generated meeting notes or natural-language conversational queries will not have those features in Phase 1.

## Reversibility
High. By keeping the domain model and storage formats free of AI-specific artifacts (like high-dimensional float vectors or model prompt templates), future AI extensions can simply consume standard note text without altering persistence structures.
