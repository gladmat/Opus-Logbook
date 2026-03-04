/**
 * FHIR R4 Export — surgical case to Bundle serialization.
 *
 * Resource mapping:
 *   Case                     → Encounter  (container)
 *   DiagnosisGroup.diagnosis → Condition   (with stage if staging present)
 *   CaseProcedure            → Procedure   (with bodySite + laterality qualifier)
 *   Full export              → Bundle (type: "collection")
 */

import { Case, DiagnosisGroup, CaseProcedure, Laterality } from "@/types/case";

// ─── FHIR R4 Type Stubs ───────────────────────────────────────────────────

interface FhirCoding {
  system?: string;
  code: string;
  display?: string;
}

interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

interface FhirResource {
  resourceType: string;
  id: string;
  [key: string]: any;
}

interface FhirBundleEntry {
  resource: FhirResource;
}

interface FhirBundle {
  resourceType: "Bundle";
  type: "collection";
  timestamp: string;
  entry: FhirBundleEntry[];
}

// ─── SNOMED Laterality Codes ───────────────────────────────────────────────

const LATERALITY_SNOMED: Record<string, FhirCoding> = {
  left: { system: "http://snomed.info/sct", code: "7771000", display: "Left" },
  right: {
    system: "http://snomed.info/sct",
    code: "24028007",
    display: "Right",
  },
  bilateral: {
    system: "http://snomed.info/sct",
    code: "51440002",
    display: "Bilateral",
  },
};

// ─── Resource Builders ─────────────────────────────────────────────────────

function buildSnomedCoding(
  code?: string,
  display?: string,
): FhirCodeableConcept | undefined {
  if (!code) return undefined;
  return {
    coding: [
      { system: "http://snomed.info/sct", code, display: display || code },
    ],
  };
}

function buildEncounter(c: Case, conditionRefs: string[]): FhirResource {
  const encounterClass =
    c.stayType === "day_case" || !c.admissionDate ? "AMB" : "IMP";
  const period: Record<string, string> = {};
  if (c.admissionDate) period.start = c.admissionDate;
  if (c.dischargeDate) period.end = c.dischargeDate;

  return {
    resourceType: "Encounter",
    id: `encounter-${c.id}`,
    status: c.caseStatus === "discharged" ? "finished" : "in-progress",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: encounterClass,
      display: encounterClass === "AMB" ? "ambulatory" : "inpatient encounter",
    },
    type: [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "387713003",
            display: "Surgical procedure",
          },
        ],
      },
    ],
    subject: { reference: `Patient/${c.patientIdentifier}` },
    ...(Object.keys(period).length > 0 ? { period } : {}),
    ...(c.facility ? { serviceProvider: { display: c.facility } } : {}),
    diagnosis: conditionRefs.map((ref, i) => ({
      condition: { reference: `Condition/${ref}` },
      rank: i + 1,
    })),
    participant: c.teamMembers?.map((m) => ({
      type: [
        {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              code: m.role || "PPRF",
            },
          ],
        },
      ],
      individual: { display: m.name },
    })),
  };
}

function buildCondition(
  group: DiagnosisGroup,
  patientRef: string,
  procedureDate: string,
): FhirResource {
  const condition: FhirResource = {
    resourceType: "Condition",
    id: `condition-${group.id}`,
    code: buildSnomedCoding(
      group.diagnosis?.snomedCtCode,
      group.diagnosis?.displayName,
    ),
    subject: { reference: `Patient/${patientRef}` },
    recordedDate: procedureDate,
  };

  // Populate stage from staging selections
  if (group.diagnosisStagingSelections) {
    const entries = Object.entries(group.diagnosisStagingSelections).filter(
      ([, v]) => v,
    );
    if (entries.length > 0) {
      condition.stage = entries.map(([systemName, value]) => ({
        summary: {
          text: value,
        } as FhirCodeableConcept,
        type: {
          text: systemName,
        } as FhirCodeableConcept,
      }));
    }
  }

  return condition;
}

function buildProcedure(
  proc: CaseProcedure,
  group: DiagnosisGroup,
  patientRef: string,
  procedureDate: string,
  ownerId: string,
): FhirResource {
  const codings: FhirCoding[] = [];
  if (proc.snomedCtCode) {
    codings.push({
      system: "http://snomed.info/sct",
      code: proc.snomedCtCode,
      display: proc.snomedCtDisplay || proc.procedureName,
    });
  }
  if (proc.localCode) {
    codings.push({
      system: proc.localCodeSystem || "local",
      code: proc.localCode,
    });
  }

  const procedure: FhirResource = {
    resourceType: "Procedure",
    id: `procedure-${proc.id}`,
    status: "completed",
    code: {
      coding: codings.length > 0 ? codings : undefined,
      text: proc.procedureName,
    },
    subject: { reference: `Patient/${patientRef}` },
    performedDateTime: procedureDate,
    reasonReference: group.diagnosis
      ? [{ reference: `Condition/condition-${group.id}` }]
      : undefined,
    performer: [
      {
        actor: { reference: `Practitioner/${ownerId}` },
        function: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              code: proc.surgeonRole,
            },
          ],
        },
      },
    ],
  };

  // bodySite with laterality qualifier
  const laterality = group.diagnosisClinicalDetails?.laterality as
    | Laterality
    | undefined;
  if (laterality && LATERALITY_SNOMED[laterality]) {
    procedure.bodySite = [
      {
        coding: [LATERALITY_SNOMED[laterality]],
      },
    ];
  }

  return procedure;
}

// ─── Bundle Builders ───────────────────────────────────────────────────────

function caseToFhirBundle(c: Case): FhirBundle {
  const entries: FhirBundleEntry[] = [];
  const conditionIds: string[] = [];

  // Build Condition + Procedure resources per group
  for (const group of c.diagnosisGroups) {
    if (group.diagnosis) {
      const condition = buildCondition(
        group,
        c.patientIdentifier,
        c.procedureDate,
      );
      conditionIds.push(condition.id);
      entries.push({ resource: condition });
    }

    for (const proc of group.procedures) {
      if (!proc.procedureName.trim()) continue;
      entries.push({
        resource: buildProcedure(
          proc,
          group,
          c.patientIdentifier,
          c.procedureDate,
          c.ownerId,
        ),
      });
    }
  }

  // Encounter as container (first entry)
  const encounter = buildEncounter(c, conditionIds);
  entries.unshift({ resource: encounter });

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: c.updatedAt || new Date().toISOString(),
    entry: entries,
  };
}

export function exportCasesAsFhir(cases: Case[]): string {
  const masterBundle: FhirBundle = {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: cases.flatMap((c) => caseToFhirBundle(c).entry),
  };
  return JSON.stringify(masterBundle, null, 2);
}

export function exportSingleCaseAsFhir(c: Case): string {
  return JSON.stringify(caseToFhirBundle(c), null, 2);
}
