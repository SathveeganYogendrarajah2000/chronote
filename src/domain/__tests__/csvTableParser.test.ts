import { describe, it, expect } from "vitest";
import {
  detectDelimiter,
  tokenizeDelimitedText,
  parseDelimitedTextToTable,
  tableToDelimitedText,
  matrixToProseMirrorTable,
} from "../csvTableParser";

describe("csvTableParser", () => {
  describe("detectDelimiter", () => {
    it("detects comma delimiter in standard CSV", () => {
      const csv = "name,role,team\nAlice,Engineer,Platform\nBob,Designer,Product";
      expect(detectDelimiter(csv)).toBe(",");
    });

    it("detects tab delimiter in TSV", () => {
      const tsv = "id\tname\tscore\n1\tAlice\t99\n2\tBob\t85";
      expect(detectDelimiter(tsv)).toBe("\t");
    });

    it("detects pipe delimiter in markdown table format", () => {
      const markdownTable = "| Column 1 | Column 2 |\n|---|---|\n| Val 1 | Val 2 |";
      expect(detectDelimiter(markdownTable)).toBe("|");
    });

    it("detects semicolon delimiter", () => {
      const semi = "key;value;desc\nPORT;8080;App port\nHOST;localhost;App host";
      expect(detectDelimiter(semi)).toBe(";");
    });

    it("defaults to comma for empty or ambiguous text", () => {
      expect(detectDelimiter("")).toBe(",");
      expect(detectDelimiter("just a single line with no delimiters")).toBe(",");
    });
  });

  describe("tokenizeDelimitedText", () => {
    it("handles standard comma separated text", () => {
      const raw = "alpha, beta, gamma\n1, 2, 3";
      const rows = tokenizeDelimitedText(raw, ",");
      expect(rows).toEqual([
        ["alpha", "beta", "gamma"],
        ["1", "2", "3"],
      ]);
    });

    it("handles quotes with commas and escaped quotes inside", () => {
      const raw = 'name,notes\n"Smith, John","He said ""Hello world"""';
      const rows = tokenizeDelimitedText(raw, ",");
      expect(rows).toEqual([
        ["name", "notes"],
        ["Smith, John", 'He said "Hello world"'],
      ]);
    });

    it("handles multiline quoted cells", () => {
      const raw = 'id,summary\n101,"Line 1\nLine 2"\n102,Simple';
      const rows = tokenizeDelimitedText(raw, ",");
      expect(rows).toEqual([
        ["id", "summary"],
        ["101", "Line 1\nLine 2"],
        ["102", "Simple"],
      ]);
    });

    it("handles pipe tables and strips markdown divider row", () => {
      const raw = `
| Service | Port | Status |
| :--- | :---: | ---: |
| Auth API | 8081 | Active |
| Gateway | 443 | Active |
`;
      const rows = tokenizeDelimitedText(raw, "|");
      expect(rows).toEqual([
        ["Service", "Port", "Status"],
        ["Auth API", "8081", "Active"],
        ["Gateway", "443", "Active"],
      ]);
    });

    it("handles custom multi-character delimiter", () => {
      const raw = "service::port::proto\nauth::8080::http\ndb::5432::tcp";
      const rows = tokenizeDelimitedText(raw, "::");
      expect(rows).toEqual([
        ["service", "port", "proto"],
        ["auth", "8080", "http"],
        ["db", "5432", "tcp"],
      ]);
    });
  });

  describe("parseDelimitedTextToTable", () => {
    it("parses CSV into ProseMirror Table with headers", () => {
      const csv = "Col A, Col B\nVal 1, Val 2\nVal 3, Val 4";
      const result = parseDelimitedTextToTable(csv, { delimiter: ",", hasHeaderRow: true });

      expect(result.columnCount).toBe(2);
      expect(result.rowCount).toBe(3);
      expect(result.headers).toEqual(["Col A", "Col B"]);
      expect(result.rows).toEqual([
        ["Val 1", "Val 2"],
        ["Val 3", "Val 4"],
      ]);

      const pm = result.proseMirrorTable;
      expect(pm.type).toBe("table");
      expect(pm.content).toHaveLength(3);

      // Row 0 has tableHeader
      const headerRow = pm.content![0];
      expect(headerRow.type).toBe("tableRow");
      expect(headerRow.content![0].type).toBe("tableHeader");
      expect(headerRow.content![0].content![0].content![0].text).toBe("Col A");

      // Row 1 has tableCell
      const dataRow = pm.content![1];
      expect(dataRow.type).toBe("tableRow");
      expect(dataRow.content![0].type).toBe("tableCell");
      expect(dataRow.content![0].content![0].content![0].text).toBe("Val 1");
    });

    it("normalizes ragged rows into rectangular grid", () => {
      const irregular = "A,B,C\n1,2\nX,Y,Z,EXTRA";
      const result = parseDelimitedTextToTable(irregular, { delimiter: "," });

      expect(result.columnCount).toBe(4);
      expect(result.allRows[0]).toEqual(["A", "B", "C", ""]);
      expect(result.allRows[1]).toEqual(["1", "2", "", ""]);
      expect(result.allRows[2]).toEqual(["X", "Y", "Z", "EXTRA"]);
    });

    it("handles auto-detection seamlessly", () => {
      const pipe = "| Alpha | Beta |\n| A | B |\n| C | D |";
      const result = parseDelimitedTextToTable(pipe, { delimiter: "auto" });

      expect(result.detectedDelimiter).toBe("|");
      expect(result.columnCount).toBe(2);
      expect(result.rowCount).toBe(3);
    });

    it("handles empty or whitespace-only input safely", () => {
      const result = parseDelimitedTextToTable("");
      expect(result.rowCount).toBe(0);
      expect(result.columnCount).toBe(0);
      expect(result.proseMirrorTable.type).toBe("table");
    });
  });

  describe("tableToDelimitedText roundtrip", () => {
    it("converts a ProseMirror table back to comma-separated CSV", () => {
      const matrix = [
        ["Title", "Language", "Version"],
        ["React", "TypeScript", "19.0"],
        ["Tauri", "Rust", "2.0"],
      ];
      const tableNode = matrixToProseMirrorTable(matrix, true);
      const csvOutput = tableToDelimitedText(tableNode, ",");

      expect(csvOutput).toBe(
        "Title,Language,Version\nReact,TypeScript,19.0\nTauri,Rust,2.0"
      );
    });

    it("escapes quotes and delimiters when converting back", () => {
      const matrix = [
        ["Item", "Description"],
        ["Book", 'A "Great" Read, Indeed'],
      ];
      const tableNode = matrixToProseMirrorTable(matrix, true);
      const csvOutput = tableToDelimitedText(tableNode, ",");

      expect(csvOutput).toBe('Item,Description\nBook,"A ""Great"" Read, Indeed"');
    });

    it("converts to pipe delimited format", () => {
      const matrix = [
        ["A", "B"],
        ["1", "2"],
      ];
      const tableNode = matrixToProseMirrorTable(matrix, true);
      const pipeOutput = tableToDelimitedText(tableNode, "|");

      expect(pipeOutput).toBe("A|B\n1|2");
    });
  });
});
