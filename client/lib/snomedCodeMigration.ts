interface SnomedMigrationEntry {
  newCode: string;
  newDisplay: string;
}

export const OLD_TO_NEW_SNOMED: Record<string, SnomedMigrationEntry> = {
  "428191000124101": {
    newCode: "442695005",
    newDisplay: "Injection of botulinum toxin (procedure)",
  },
  "13413003": {
    newCode: "787876008",
    newDisplay: "Injection of dermal filler (procedure)",
  },
  "36777000": {
    newCode: "89658006",
    newDisplay: "Treatment of burn (procedure)",
  },
  "234296008": {
    newCode: "234281001",
    newDisplay: "Pedicled latissimus dorsi flap (procedure)",
  },
  "15257006": {
    newCode: "179097006",
    newDisplay:
      "Closed reduction of fracture with internal fixation (procedure)",
  },
  "302441008": {
    newCode: "72310004",
    newDisplay: "Abdominoplasty (procedure)",
  },
  "174295000": {
    newCode: "69794004",
    newDisplay: "Aspiration procedure (procedure)",
  },
  "122465003": {
    newCode: "440299008",
    newDisplay: "Mohs micrographic surgery (procedure)",
  },
  "239248002": {
    newCode: "178730002",
    newDisplay: "Repair of mallet deformity (procedure)",
  },
  "54516008": {
    newCode: "286553006",
    newDisplay: "Plastic operation on face (procedure)",
  },
  "212978003": {
    newCode: "284003005",
    newDisplay: "Injury of finger (disorder)",
  },
  "422413001": {
    newCode: "53441006",
    newDisplay: "Dermatochalasis (disorder)",
  },
  "236507001": {
    newCode: "267639000",
    newDisplay: "Capsular contracture of breast (disorder)",
  },
  "62480006": { newCode: "62961003", newDisplay: "Rhinoplasty (procedure)" },
  "41899006": {
    newCode: "75732000",
    newDisplay: "Blepharoplasty of upper eyelid (procedure)",
  },
};

export function migrateSnomedCode(code: string): SnomedMigrationEntry | null {
  return OLD_TO_NEW_SNOMED[code] || null;
}
