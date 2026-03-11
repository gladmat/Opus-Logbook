// ════════════════════════════════════════════════════════════════
// Dimension 1: Operative Role — what position in the surgical team
// ════════════════════════════════════════════════════════════════

export type OperativeRole =
  | "SURGEON" // Performed ≥50% of procedure including critical portions
  | "FIRST_ASST" // Scrubbed, actively assisting primary surgeon
  | "SECOND_ASST" // Scrubbed, additional assistance (retraction, etc.)
  | "OBSERVER" // Present but not scrubbed or performing
  | "SUPERVISOR"; // Overseeing a more junior operator performing the case

export const OPERATIVE_ROLE_LABELS: Record<OperativeRole, string> = {
  SURGEON: "Surgeon",
  FIRST_ASST: "First Assistant",
  SECOND_ASST: "Second Assistant",
  OBSERVER: "Observer",
  SUPERVISOR: "Supervisor",
};

export const OPERATIVE_ROLE_SHORT_LABELS: Record<OperativeRole, string> = {
  SURGEON: "Surgeon",
  FIRST_ASST: "1st Asst",
  SECOND_ASST: "2nd Asst",
  OBSERVER: "Observer",
  SUPERVISOR: "Supervisor",
};

export const OPERATIVE_ROLE_DESCRIPTIONS: Record<OperativeRole, string> = {
  SURGEON:
    "You performed the procedure (≥50% including critical portions)",
  FIRST_ASST:
    "You were scrubbed and actively assisting the primary surgeon",
  SECOND_ASST:
    "You provided additional scrubbed assistance (retraction, etc.)",
  OBSERVER: "You were present but not scrubbed or performing",
  SUPERVISOR:
    "You supervised a more junior surgeon performing the case",
};

// ════════════════════════════════════════════════════════════════
// Dimension 2: Supervision/Autonomy Level
// ════════════════════════════════════════════════════════════════

export type SupervisionLevel =
  | "INDEPENDENT" // No supervisor present or needed
  | "SUP_AVAILABLE" // Supervisor in hospital, not in theatre
  | "SUP_PRESENT" // Supervisor in theatre ≥70%, not scrubbed
  | "SUP_SCRUBBED" // Supervisor scrubbed at table
  | "DIRECTED" // Supervisor actively guiding throughout
  | "NOT_APPLICABLE"; // Role doesn't require supervision classification

export const SUPERVISION_LABELS: Record<SupervisionLevel, string> = {
  INDEPENDENT: "Independent",
  SUP_AVAILABLE: "Supervisor available (not in theatre)",
  SUP_PRESENT: "Supervisor present unscrubbed",
  SUP_SCRUBBED: "Supervisor scrubbed",
  DIRECTED: "Direct guidance throughout",
  NOT_APPLICABLE: "N/A",
};

export const SUPERVISION_SHORT_LABELS: Record<SupervisionLevel, string> = {
  INDEPENDENT: "Independent",
  SUP_AVAILABLE: "Sup. available",
  SUP_PRESENT: "Sup. present",
  SUP_SCRUBBED: "Sup. scrubbed",
  DIRECTED: "Directed",
  NOT_APPLICABLE: "N/A",
};

export const SUPERVISION_DESCRIPTIONS: Record<SupervisionLevel, string> = {
  INDEPENDENT: "No supervisor present or needed for this procedure",
  SUP_AVAILABLE:
    "Supervisor in the hospital but not present in theatre",
  SUP_PRESENT:
    "Supervisor present in theatre for ≥70% of the procedure, not scrubbed",
  SUP_SCRUBBED:
    "Supervisor scrubbed at the table, available to take over",
  DIRECTED:
    "Supervisor actively guiding and directing you throughout",
  NOT_APPLICABLE: "Not applicable for this role",
};

/**
 * Supervision picker is only shown when operative role = SURGEON.
 * For all other roles, supervision is automatically NOT_APPLICABLE.
 */
export function supervisionApplicable(role: OperativeRole): boolean {
  return role === "SURGEON";
}

/**
 * Returns the valid supervision options for a given role.
 * SURGEON: all levels except NOT_APPLICABLE
 * All others: only NOT_APPLICABLE (auto-set, not shown)
 */
export function validSupervisionLevels(
  role: OperativeRole,
): SupervisionLevel[] {
  if (role === "SURGEON") {
    return [
      "INDEPENDENT",
      "SUP_AVAILABLE",
      "SUP_PRESENT",
      "SUP_SCRUBBED",
      "DIRECTED",
    ];
  }
  return ["NOT_APPLICABLE"];
}

// ════════════════════════════════════════════════════════════════
// Dimension 3: Responsible Clinician (case-level, not a type enum)
// Stored as name + optional userId reference on the Case interface.
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// Legacy migration mapping
// ════════════════════════════════════════════════════════════════

/** Old combined role codes from the current ProcedureEntryCard */
export type LegacySurgeonRole =
  | "PS"
  | "PP"
  | "AS"
  | "ONS"
  | "SS"
  | "SNS"
  | "A";

export const LEGACY_ROLE_LABELS: Record<LegacySurgeonRole, string> = {
  PS: "Primary Surgeon",
  PP: "Performed with Peer",
  AS: "Assisting (scrubbed)",
  ONS: "Observing (not scrubbed)",
  SS: "Supervising (scrubbed)",
  SNS: "Supervising (not scrubbed)",
  A: "Available",
};

const LEGACY_ROLE_SET = new Set<string>([
  "PS",
  "PP",
  "AS",
  "ONS",
  "SS",
  "SNS",
  "A",
]);

const OPERATIVE_ROLE_SET = new Set<string>([
  "SURGEON",
  "FIRST_ASST",
  "SECOND_ASST",
  "OBSERVER",
  "SUPERVISOR",
]);

/** Check if a string is a legacy role code */
export function isLegacyRole(role: string): role is LegacySurgeonRole {
  return LEGACY_ROLE_SET.has(role);
}

/** Check if a string is a new operative role */
export function isOperativeRole(role: string): role is OperativeRole {
  return OPERATIVE_ROLE_SET.has(role);
}

/**
 * Maps old single-field surgeonRole to the new two-dimensional model.
 * Lossless for all codes except PP which maps to SURGEON + INDEPENDENT
 * (two consultants of equal standing, no supervision hierarchy).
 */
export function migrateLegacyRole(
  legacy: LegacySurgeonRole,
): { role: OperativeRole; supervision: SupervisionLevel } {
  switch (legacy) {
    case "PS":
      return { role: "SURGEON", supervision: "INDEPENDENT" };
    case "PP":
      return { role: "SURGEON", supervision: "INDEPENDENT" };
    case "AS":
      return { role: "FIRST_ASST", supervision: "NOT_APPLICABLE" };
    case "ONS":
      return { role: "OBSERVER", supervision: "NOT_APPLICABLE" };
    case "SS":
      return { role: "SUPERVISOR", supervision: "NOT_APPLICABLE" };
    case "SNS":
      return { role: "SUPERVISOR", supervision: "NOT_APPLICABLE" };
    case "A":
      return { role: "OBSERVER", supervision: "NOT_APPLICABLE" };
    default:
      return { role: "SURGEON", supervision: "INDEPENDENT" };
  }
}

/**
 * Maps new OperativeRole + SupervisionLevel back to the nearest legacy Role code.
 * Used for backward compatibility when saving cases.
 */
export function toNearestLegacyRole(
  role: OperativeRole,
  supervision: SupervisionLevel,
): LegacySurgeonRole {
  switch (role) {
    case "FIRST_ASST":
    case "SECOND_ASST":
      return "AS";
    case "OBSERVER":
      return "ONS";
    case "SUPERVISOR":
      return supervision === "NOT_APPLICABLE" || supervision === "SUP_PRESENT"
        ? "SNS"
        : "SS";
    case "SURGEON":
      switch (supervision) {
        case "INDEPENDENT":
        case "SUP_AVAILABLE":
          return "PS";
        case "SUP_PRESENT":
        case "SUP_SCRUBBED":
        case "DIRECTED":
          return "PS"; // Still the surgeon, just supervised
        default:
          return "PS";
      }
    default:
      return "PS";
  }
}

// ════════════════════════════════════════════════════════════════
// Computed helpers
// ════════════════════════════════════════════════════════════════

/**
 * Resolves the effective role for a procedure, applying case-level defaults.
 * Used everywhere a procedure's role needs to be displayed or exported.
 */
export function resolveOperativeRole(
  procedureOverride: OperativeRole | undefined,
  caseDefault: OperativeRole | undefined,
): OperativeRole {
  return procedureOverride ?? caseDefault ?? "SURGEON";
}

export function resolveSupervisionLevel(
  procedureOverride: SupervisionLevel | undefined,
  caseDefault: SupervisionLevel | undefined,
  effectiveRole: OperativeRole,
): SupervisionLevel {
  if (!supervisionApplicable(effectiveRole)) return "NOT_APPLICABLE";
  return procedureOverride ?? caseDefault ?? "INDEPENDENT";
}

/**
 * Returns true if this procedure has a per-procedure override
 * (i.e., differs from case defaults).
 */
export function hasRoleOverride(procedure: {
  operativeRoleOverride?: OperativeRole;
  supervisionLevelOverride?: SupervisionLevel;
}): boolean {
  return (
    procedure.operativeRoleOverride !== undefined ||
    procedure.supervisionLevelOverride !== undefined
  );
}

/**
 * Formats role + supervision as a compact display string.
 * e.g., "Surgeon · Sup. scrubbed" or "1st Asst"
 */
export function formatRoleDisplay(
  role: OperativeRole,
  supervision: SupervisionLevel,
): string {
  if (!supervisionApplicable(role)) {
    return OPERATIVE_ROLE_SHORT_LABELS[role];
  }
  return `${OPERATIVE_ROLE_SHORT_LABELS[role]} · ${SUPERVISION_SHORT_LABELS[supervision]}`;
}

// ════════════════════════════════════════════════════════════════
// Export mappings — convert to target system formats
// ════════════════════════════════════════════════════════════════

/** RACS MALT Plastics supervision values */
export type RacsMaltPlasticsValue =
  | "Surgeon alone"
  | "Mentor available"
  | "Mentor scrubbed"
  | "Assistant"
  | "Observer";

export function toRacsMaltPlastics(
  role: OperativeRole,
  supervision: SupervisionLevel,
): RacsMaltPlasticsValue {
  if (role === "OBSERVER") return "Observer";
  if (role === "FIRST_ASST" || role === "SECOND_ASST") return "Assistant";
  if (role === "SUPERVISOR") return "Surgeon alone";
  // role === 'SURGEON'
  switch (supervision) {
    case "INDEPENDENT":
    case "SUP_AVAILABLE":
      return "Surgeon alone";
    case "SUP_PRESENT":
      return "Mentor available";
    case "SUP_SCRUBBED":
    case "DIRECTED":
      return "Mentor scrubbed";
    default:
      return "Surgeon alone";
  }
}

/** RACS MALT JDocs values */
export type RacsMaltJDocsValue =
  | "Independent"
  | "Supervised"
  | "1st Assistant"
  | "2nd Assistant"
  | "Observed";

export function toRacsMaltJDocs(
  role: OperativeRole,
  supervision: SupervisionLevel,
): RacsMaltJDocsValue {
  if (role === "OBSERVER") return "Observed";
  if (role === "FIRST_ASST") return "1st Assistant";
  if (role === "SECOND_ASST") return "2nd Assistant";
  if (role === "SUPERVISOR") return "Independent";
  // role === 'SURGEON'
  if (supervision === "INDEPENDENT" || supervision === "SUP_AVAILABLE") {
    return "Independent";
  }
  return "Supervised";
}

/** UK ISCP eLogbook codes */
export type UkElogbookCode = "O" | "A" | "S-TS" | "S-TU" | "P" | "T";

export function toUkElogbook(
  role: OperativeRole,
  supervision: SupervisionLevel,
): UkElogbookCode {
  if (role === "OBSERVER") return "O";
  if (role === "FIRST_ASST" || role === "SECOND_ASST") return "A";
  if (role === "SUPERVISOR") return "T";
  // role === 'SURGEON'
  switch (supervision) {
    case "SUP_SCRUBBED":
    case "DIRECTED":
      return "S-TS";
    case "SUP_PRESENT":
      return "S-TU";
    case "INDEPENDENT":
    case "SUP_AVAILABLE":
    default:
      return "P";
  }
}

/** ACGME General Surgery role codes */
export type AcgmeRoleCode = "SC" | "SJ" | "FA" | "TA";

export function toAcgmeGeneralSurgery(
  role: OperativeRole,
  _supervision: SupervisionLevel,
  isSeniorResident: boolean = true,
): AcgmeRoleCode {
  if (role === "SUPERVISOR") return "TA";
  if (role === "FIRST_ASST" || role === "SECOND_ASST") return "FA";
  if (role === "OBSERVER") return "FA"; // ACGME has no observer — closest is FA
  // role === 'SURGEON'
  return isSeniorResident ? "SC" : "SJ";
}

/** German Weiterbildung values */
export type GermanWbValue =
  | "Selbstverantwortlich"
  | "Unter Anleitung"
  | "Assistiert";

export function toGermanWeiterbildung(
  role: OperativeRole,
  supervision: SupervisionLevel,
): GermanWbValue {
  if (role === "FIRST_ASST" || role === "SECOND_ASST") return "Assistiert";
  if (role === "OBSERVER") return "Assistiert";
  if (role === "SUPERVISOR") return "Selbstverantwortlich";
  // role === 'SURGEON'
  if (supervision === "INDEPENDENT" || supervision === "SUP_AVAILABLE") {
    return "Selbstverantwortlich";
  }
  return "Unter Anleitung";
}

/** Swiss SIWF values */
export type SwissSiwfValue = "O" | "AI" | "A";

export function toSwissSiwf(
  role: OperativeRole,
  supervision: SupervisionLevel,
): SwissSiwfValue {
  if (role === "FIRST_ASST" || role === "SECOND_ASST") return "A";
  if (role === "OBSERVER") return "A";
  if (role === "SUPERVISOR") return "O";
  // role === 'SURGEON'
  if (supervision === "INDEPENDENT" || supervision === "SUP_AVAILABLE") {
    return "O";
  }
  return "AI";
}
