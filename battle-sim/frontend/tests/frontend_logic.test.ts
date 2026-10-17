import { describe, it, expect } from "vitest";

// 1. Win Rate Formatting Logic
export function formatWinRate(rate: number, ci?: number): string {
  const percent = rate > 1 ? Math.min(100, Math.max(0, rate)) : Math.min(100, Math.max(0, rate * 100));
  const rounded = Math.round(percent);
  return ci !== undefined ? `${rounded}% (±${Math.round(ci)}%)` : `${rounded}%`;
}

// 2. Tick Scrubber Logic
export function clampTick(newTick: number, maxTicks: number): number {
  return Math.min(maxTicks, Math.max(1, newTick));
}

// 3. Line Number Extractor for Validation Errors
export function extractLineNumber(errorStr: string): string {
  const match = errorStr.match(/line (\d+)/i) || errorStr.match(/row (\d+)/i);
  return match ? match[1] : "-";
}

// 4. Client-side File Extension Validator
export function validateUploadExtension(filename: string): { valid: boolean; error?: string } {
  const lower = filename.toLowerCase();
  const validExts = [".json", ".csv", ".zip"];
  const isValid = validExts.some((ext) => lower.endsWith(ext));
  if (!isValid) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload a .json, .csv, or .zip archive.",
    };
  }
  return { valid: true };
}

describe("Frontend Core Logic Tests", () => {
  it("formats win rate percentages and confidence intervals accurately", () => {
    expect(formatWinRate(0.624)).toBe("62%");
    expect(formatWinRate(0.624, 5.2)).toBe("62% (±5%)");
    expect(formatWinRate(0)).toBe("0%");
    expect(formatWinRate(1.0, 0)).toBe("100% (±0%)");
  });

  it("handles tick scrubber clamping and step boundaries", () => {
    const maxTicks = 40;
    expect(clampTick(15, maxTicks)).toBe(15);
    // Boundary check below 1
    expect(clampTick(0, maxTicks)).toBe(1);
    expect(clampTick(-5, maxTicks)).toBe(1);
    // Boundary check above maxTicks
    expect(clampTick(45, maxTicks)).toBe(40);
  });

  it("extracts line and row numbers from validation error messages", () => {
    expect(extractLineNumber("hazards.csv line 14: unknown scenario_id 'coin_race_v2'")).toBe("14");
    expect(extractLineNumber("creatures.csv line 6: hp must be 1–500")).toBe("6");
    expect(extractLineNumber("battles.json row 3: missing field 'seed'")).toBe("3");
    expect(extractLineNumber("General syntax error")).toBe("-");
  });

  it("rejects unsupported file formats before uploading", () => {
    expect(validateUploadExtension("malicious.exe").valid).toBe(false);
    expect(validateUploadExtension("document.pdf").valid).toBe(false);
    expect(validateUploadExtension("image.png").valid).toBe(false);

    expect(validateUploadExtension("creatures.csv").valid).toBe(true);
    expect(validateUploadExtension("scenario.json").valid).toBe(true);
    expect(validateUploadExtension("battles_bundle.zip").valid).toBe(true);
  });
});
