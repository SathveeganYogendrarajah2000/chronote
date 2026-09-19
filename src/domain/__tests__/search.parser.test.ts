import { describe, it, expect } from "vitest";
import {
  tokenizeSearchQuery,
  parseSearchQuery,
  compileFts5Match,
  isQueryEmpty,
} from "../search.parser";

describe("search.parser", () => {
  it("tokenizes search queries respecting quotes", () => {
    const tokens = tokenizeSearchQuery('tag:springboot "JWT Auth Token" type:code');
    expect(tokens).toEqual(["tag:springboot", '"JWT Auth Token"', "type:code"]);
  });

  it("parses compound queries with tags, types, language, and free text", () => {
    const ast = parseSearchQuery("tag:springboot type:code lang:java authentication");
    expect(ast.tags).toEqual(["springboot"]);
    expect(ast.blockTypes).toEqual(["code"]);
    expect(ast.languages).toEqual(["java"]);
    expect(ast.textTokens).toEqual(["authentication"]);
  });

  it("parses dates, after, and before filters", () => {
    const ast = parseSearchQuery("date:2026-09-16 after:2026-09-01 before:2026-09-30");
    expect(ast.exactDate).toBe("2026-09-16");
    expect(ast.afterDate).toBe("2026-09-01");
    expect(ast.beforeDate).toBe("2026-09-30");
  });

  it("parses document types: type:dsm and type:note", () => {
    const astDsm = parseSearchQuery("type:dsm incident");
    expect(astDsm.documentTypes).toEqual(["dsm"]);
    expect(astDsm.textTokens).toEqual(["incident"]);

    const astNote = parseSearchQuery("type:note architecture");
    expect(astNote.documentTypes).toEqual(["general"]);
    expect(astNote.textTokens).toEqual(["architecture"]);
  });

  it("parses exact quoted phrases", () => {
    const ast = parseSearchQuery('"NullPointerException" error');
    expect(ast.exactPhrases).toEqual(["NullPointerException"]);
    expect(ast.textTokens).toEqual(["error"]);
  });

  it("normalizes tag names with hash symbols", () => {
    const ast = parseSearchQuery("tag:#Docker-Setup tag:mongodb");
    expect(ast.tags).toEqual(["docker-setup", "mongodb"]);
  });

  it("checks empty query", () => {
    expect(isQueryEmpty(parseSearchQuery(""))).toBe(true);
    expect(isQueryEmpty(parseSearchQuery("   "))).toBe(true);
    expect(isQueryEmpty(parseSearchQuery("auth"))).toBe(false);
  });

  it("compiles FTS5 MATCH expression", () => {
    const ast = parseSearchQuery('tag:springboot type:code "JWT" token*');
    const fts = compileFts5Match(ast);
    expect(fts).toBe('tags:springboot AND block_type:code* AND "JWT" AND token*');
  });
});
