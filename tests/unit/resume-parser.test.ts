import { describe, it, expect } from "vitest";
import { parsePdfResume, isValidPdfSignature } from "@/server/resume/parser";

describe("PDF Resume Parser", () => {
  it("validates standard PDF header signature %PDF-", () => {
    const validHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    expect(isValidPdfSignature(validHeader)).toBe(true);

    const invalidHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]); // PNG
    expect(isValidPdfSignature(invalidHeader)).toBe(false);

    const tooShort = new Uint8Array([0x25, 0x50]);
    expect(isValidPdfSignature(tooShort)).toBe(false);
  });

  it("rejects empty files gracefully", async () => {
    const emptyBuffer = new Uint8Array([]);
    const result = await parsePdfResume(emptyBuffer);
    expect(result.success).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects non-PDF files missing the %PDF- signature", async () => {
    const fakeBuffer = new TextEncoder().encode("Hello world, this is a plain text file.");
    const result = await parsePdfResume(fakeBuffer);
    expect(result.success).toBe(false);
    expect(result.error).toContain("missing standard PDF header");
  });

  it("rejects oversized buffers (> 5MB)", async () => {
    const oversizedBuffer = new Uint8Array(5.5 * 1024 * 1024);
    oversizedBuffer[0] = 0x25;
    oversizedBuffer[1] = 0x50;
    oversizedBuffer[2] = 0x44;
    oversizedBuffer[3] = 0x46;
    oversizedBuffer[4] = 0x2d;

    const result = await parsePdfResume(oversizedBuffer);
    expect(result.success).toBe(false);
    expect(result.error).toContain("exceeds the 5MB upload limit");
  });

  it("handles corrupt PDF buffers gracefully without crashing", async () => {
    // Valid signature but corrupt payload
    const corruptBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x00, 0x11, 0x22, 0x33, 0x44]);
    const result = await parsePdfResume(corruptBuffer);
    expect(result.success).toBe(false);
    expect(result.error).toContain("corrupted or malformed");
  });
});
