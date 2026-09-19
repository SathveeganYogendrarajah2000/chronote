import { describe, it, expect } from "vitest";
import { normalizeTag, isValidTag, normalizeTagList } from "../tagNormalizer";

describe("tagNormalizer", () => {
  it("strips leading hash characters and whitespace", () => {
    expect(normalizeTag("#springboot")).toBe("springboot");
    expect(normalizeTag("###backend")).toBe("backend");
    expect(normalizeTag("  #aws  ")).toBe("aws");
    expect(normalizeTag("jwt")).toBe("jwt");
  });

  it("converts uppercase to lowercase", () => {
    expect(normalizeTag("#SpringBoot")).toBe("springboot");
    expect(normalizeTag("MongoDB")).toBe("mongodb");
    expect(normalizeTag("REACT-19")).toBe("react-19");
  });

  it("validates allowed characters", () => {
    expect(isValidTag("springboot")).toBe(true);
    expect(isValidTag("spring-boot_2")).toBe(true);
    expect(isValidTag("aws_lambda")).toBe(true);

    // Invalid characters
    expect(isValidTag("tag with spaces")).toBe(false);
    expect(isValidTag("tag$special")).toBe(false);
    expect(isValidTag("")).toBe(false);
  });

  it("normalizes and deduplicates tag lists", () => {
    const raw = ["#springboot", "SpringBoot", "aws", "  #aws  ", "#backend", ""];
    const result = normalizeTagList(raw);
    expect(result).toEqual(["aws", "backend", "springboot"]);
  });
});
