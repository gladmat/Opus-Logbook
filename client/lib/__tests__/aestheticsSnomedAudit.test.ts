import { describe, it, expect } from "vitest";
import { AESTHETICS_DIAGNOSES } from "../diagnosisPicklists/aestheticsDiagnoses";
import { OLD_TO_NEW_SNOMED } from "../snomedCodeMigration";

// Import all procedure entries to scan aesthetics subset
// We need to grep the actual picklist, but for test purposes we check the file content
import * as fs from "fs";
import * as path from "path";

const PROCEDURE_PICKLIST_PATH = path.resolve(
  __dirname,
  "../procedurePicklist.ts",
);
const DIAGNOSIS_PATH = path.resolve(
  __dirname,
  "../diagnosisPicklists/aestheticsDiagnoses.ts",
);

describe("Aesthetics SNOMED CT audit", () => {
  it("zero VERIFY comments in aesthetics diagnosis entries", () => {
    const content = fs.readFileSync(DIAGNOSIS_PATH, "utf-8");
    const verifyCount = (content.match(/\/\/ VERIFY/g) || []).length;
    expect(verifyCount).toBe(0);
  });

  it("zero VERIFY comments on aesthetics procedure entries (aes_/bc_ section)", () => {
    const content = fs.readFileSync(PROCEDURE_PICKLIST_PATH, "utf-8");
    const lines = content.split("\n");

    // Find the aesthetics section start (around line 5283)
    let aestheticsStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.includes("AESTHETICS — FACIAL SURGICAL")) {
        aestheticsStart = i;
        break;
      }
    }

    // If we can't find the section header, check by ID prefix
    let verifyCount = 0;
    let inAestheticsEntry = false;
    for (let i = Math.max(0, aestheticsStart); i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (line.includes('id: "aes_') || line.includes('id: "bc_')) {
        inAestheticsEntry = true;
      }
      if (
        inAestheticsEntry &&
        line.includes("// VERIFY") &&
        line.includes("snomedCtCode")
      ) {
        verifyCount++;
      }
      // Reset on next entry boundary
      if (line.includes("sortOrder:") || line.trim() === "},") {
        inAestheticsEntry = false;
      }
    }

    expect(verifyCount).toBe(0);
  });

  it("all aesthetics diagnoses have non-empty SNOMED codes", () => {
    for (const dx of AESTHETICS_DIAGNOSES) {
      expect(dx.snomedCtCode).toBeTruthy();
      expect(dx.snomedCtCode.length).toBeGreaterThan(0);
    }
  });

  it("all aesthetics diagnoses have non-empty SNOMED display names", () => {
    for (const dx of AESTHETICS_DIAGNOSES) {
      expect(dx.snomedCtDisplay).toBeTruthy();
      expect(dx.snomedCtDisplay.length).toBeGreaterThan(0);
    }
  });

  it("changed diagnosis codes have migration entries", () => {
    // These old codes were replaced in the audit
    const changedCodes = [
      "248296006", // aging face → redundant skin
      "248295007", // physique type → facial asymmetry
      "95345000", // not found → hypertrophy of vulva
      "419459005", // not found → redundant skin
    ];

    for (const oldCode of changedCodes) {
      expect(OLD_TO_NEW_SNOMED[oldCode]).toBeDefined();
      expect(OLD_TO_NEW_SNOMED[oldCode]?.newCode).toBeTruthy();
    }
  });

  it("neurotoxin migration entry uses correct code", () => {
    // US Extension 428191000124101 should map to International 404909007
    const entry = OLD_TO_NEW_SNOMED["428191000124101"];
    expect(entry).toBeDefined();
    expect(entry?.newCode).toBe("404909007");
  });

  it("filler migration entry uses correct code", () => {
    // 13413003 was NOT_FOUND → should map to 1373233002
    const entry = OLD_TO_NEW_SNOMED["13413003"];
    expect(entry).toBeDefined();
    expect(entry?.newCode).toBe("1373233002");
  });

  it("cross-reference: all diagnosis procedure suggestions reference valid procedure IDs", () => {
    const content = fs.readFileSync(PROCEDURE_PICKLIST_PATH, "utf-8");

    for (const dx of AESTHETICS_DIAGNOSES) {
      if (dx.suggestedProcedures) {
        for (const sp of dx.suggestedProcedures) {
          expect(
            content.includes(`"${sp.procedurePicklistId}"`),
          ).toBe(true);
        }
      }
    }
  });
});
