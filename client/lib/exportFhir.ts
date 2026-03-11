/**
 * FHIR R4 Export — surgical case to Bundle serialization.
 *
 * Resource mapping:
 *   TreatmentEpisode         → EpisodeOfCare (cross-case container)
 *   Case                     → Encounter  (per-case container)
 *   DiagnosisGroup.diagnosis → Condition   (with stage if staging present)
 *   CaseProcedure            → Procedure   (with bodySite + laterality qualifier)
 *   Full export              → Bundle (type: "collection")
 */

import { Case, DiagnosisGroup, CaseProcedure, Laterality } from "@/types/case";
import {
  resolveOperativeRole,
  resolveSupervisionLevel,
  toNearestLegacyRole,
  OPERATIVE_ROLE_LABELS,
  SUPERVISION_LABELS,
} from "@/types/operativeRole";
import {
  HAND_INFECTION_TYPE_LABELS,
  SEVERITY_LABELS as HAND_SEVERITY_LABELS,
  HAND_ORGANISM_LABELS,
  HAND_ANTIBIOTIC_LABELS,
  countKanavelSigns,
} from "@/types/handInfection";
import {
  TreatmentEpisode,
  EpisodeStatus,
  EncounterClass,
  EPISODE_TYPE_LABELS,
} from "@/types/episode";
import { IMPLANT_CATALOGUE } from "@/data/implantCatalogue";
import { JOINT_TYPE_LABELS } from "@/types/jointImplant";
import {
  IMPLANT_DIGIT_LABELS,
  IMPLANT_LATERALITY_LABELS,
} from "@/lib/jointImplant";

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

// ─── Episode & Encounter Class Mappings ──────────────────────────────────

const EPISODE_STATUS_TO_FHIR: Record<EpisodeStatus, string> = {
  planned: "planned",
  active: "active",
  on_hold: "onhold",
  completed: "finished",
  cancelled: "cancelled",
};

const ENCOUNTER_CLASS_TO_FHIR: Record<
  EncounterClass,
  { code: string; display: string }
> = {
  inpatient_theatre: { code: "IMP", display: "inpatient encounter" },
  day_case_theatre: { code: "AMB", display: "ambulatory" },
  outpatient_procedure: { code: "AMB", display: "ambulatory" },
  emergency_theatre: { code: "EMER", display: "emergency" },
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

function buildEpisodeOfCare(episode: TreatmentEpisode): FhirResource {
  const period: Record<string, string> = { start: episode.onsetDate };
  if (episode.resolvedDate) period.end = episode.resolvedDate;

  return {
    resourceType: "EpisodeOfCare",
    id: `episode-${episode.id}`,
    status: EPISODE_STATUS_TO_FHIR[episode.status],
    type: [
      {
        coding: [
          {
            system: "urn:opus:episode-type",
            code: episode.type,
            display: EPISODE_TYPE_LABELS[episode.type],
          },
        ],
      },
    ],
    diagnosis: episode.primaryDiagnosisCode
      ? [
          {
            condition: { display: episode.primaryDiagnosisDisplay },
            role: buildSnomedCoding(
              episode.primaryDiagnosisCode,
              episode.primaryDiagnosisDisplay,
            ),
          },
        ]
      : undefined,
    patient: { reference: `Patient/${episode.patientIdentifier}` },
    period,
  };
}

function buildEncounter(c: Case, conditionRefs: string[]): FhirResource {
  // Use EncounterClass if present, otherwise fall back to legacy stayType mapping
  let classCode: string;
  let classDisplay: string;
  if (c.encounterClass && ENCOUNTER_CLASS_TO_FHIR[c.encounterClass]) {
    const mapping = ENCOUNTER_CLASS_TO_FHIR[c.encounterClass];
    classCode = mapping.code;
    classDisplay = mapping.display;
  } else {
    classCode = c.stayType === "day_case" || !c.admissionDate ? "AMB" : "IMP";
    classDisplay = classCode === "AMB" ? "ambulatory" : "inpatient encounter";
  }

  const period: Record<string, string> = {};
  if (c.admissionDate) period.start = c.admissionDate;
  if (c.dischargeDate) period.end = c.dischargeDate;

  return {
    resourceType: "Encounter",
    id: `encounter-${c.id}`,
    status:
      c.caseStatus === "planned"
        ? "planned"
        : c.caseStatus === "discharged"
          ? "finished"
          : "in-progress",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: classCode,
      display: classDisplay,
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
    ...(c.episodeId
      ? {
          episodeOfCare: [
            { reference: `EpisodeOfCare/episode-${c.episodeId}` },
          ],
        }
      : {}),
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

  // Hand infection details as extension
  if (group.handInfectionDetails) {
    const hi = group.handInfectionDetails;
    const extensions: { url: string; valueString: string }[] = [
      {
        url: "infectionType",
        valueString: HAND_INFECTION_TYPE_LABELS[hi.infectionType],
      },
      {
        url: "severity",
        valueString: HAND_SEVERITY_LABELS[hi.severity],
      },
    ];
    if (hi.affectedDigits.length > 0) {
      extensions.push({
        url: "affectedDigits",
        valueString: hi.affectedDigits.join(", "),
      });
    }
    if (hi.organism) {
      extensions.push({
        url: "organism",
        valueString: HAND_ORGANISM_LABELS[hi.organism],
      });
    }
    if (hi.empiricalAntibiotic) {
      extensions.push({
        url: "empiricalAntibiotic",
        valueString: HAND_ANTIBIOTIC_LABELS[hi.empiricalAntibiotic],
      });
    }
    if (hi.kanavelSigns) {
      extensions.push({
        url: "kanavelSigns",
        valueString: `${countKanavelSigns(hi.kanavelSigns)}/4`,
      });
    }
    condition.extension = [
      {
        url: "opus:handInfectionDetails",
        extension: extensions,
      },
    ];
  }

  return condition;
}

function buildProcedure(
  proc: CaseProcedure,
  group: DiagnosisGroup,
  patientRef: string,
  procedureDate: string,
  ownerId: string,
  caseData: Case,
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
    performer: (() => {
      const effectiveRole = resolveOperativeRole(
        proc.operativeRoleOverride,
        caseData.defaultOperativeRole,
      );
      const effectiveSupervision = resolveSupervisionLevel(
        proc.supervisionLevelOverride,
        caseData.defaultSupervisionLevel,
        effectiveRole,
      );
      const performers: Record<string, unknown>[] = [
        {
          actor: { reference: `Practitioner/${ownerId}` },
          function: {
            coding: [
              {
                system:
                  "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                code: toNearestLegacyRole(effectiveRole, effectiveSupervision),
                display: OPERATIVE_ROLE_LABELS[effectiveRole],
              },
            ],
          },
        },
      ];
      if (caseData.responsibleConsultantName) {
        performers.push({
          actor: { display: caseData.responsibleConsultantName },
          function: {
            coding: [
              {
                system:
                  "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                code: "ATND",
                display: "attender",
              },
            ],
          },
        });
      }
      return performers;
    })(),
    extension: (() => {
      const effectiveRole = resolveOperativeRole(
        proc.operativeRoleOverride,
        caseData.defaultOperativeRole,
      );
      const supervisionLevel = resolveSupervisionLevel(
        proc.supervisionLevelOverride,
        caseData.defaultSupervisionLevel,
        effectiveRole,
      );
      if (supervisionLevel === "NOT_APPLICABLE") return undefined;
      return [
        {
          url: "urn:opus:supervision-level",
          valueString: SUPERVISION_LABELS[supervisionLevel],
        },
      ];
    })(),
  };

  // bodySite with implant-aware laterality and digit context
  const laterality = (proc.implantDetails?.laterality ??
    group.diagnosisClinicalDetails?.laterality) as Laterality | undefined;
  const digit = proc.implantDetails?.digit;
  if (laterality && LATERALITY_SNOMED[laterality]) {
    procedure.bodySite = [
      {
        coding: [LATERALITY_SNOMED[laterality]],
        ...(digit
          ? {
              text: `${IMPLANT_DIGIT_LABELS[digit]}${
                proc.implantDetails?.jointType === "cmc1" ? " CMC1" : ""
              }`,
            }
          : {}),
      },
    ];
  } else if (digit) {
    procedure.bodySite = [
      {
        text: IMPLANT_DIGIT_LABELS[digit],
      },
    ];
  }

  return procedure;
}

function buildDevice(proc: CaseProcedure): FhirResource | undefined {
  const implant = proc.implantDetails;
  if (!implant?.implantSystemId) return undefined;

  const implantEntry = IMPLANT_CATALOGUE[implant.implantSystemId];
  const device: FhirResource = {
    resourceType: "Device",
    id: `device-${proc.id}`,
    type: {
      text:
        implantEntry?.displayName ??
        implant.implantSystemOther ??
        "Joint implant",
    },
    status: "active",
  };

  if (implantEntry?.manufacturer) {
    device.manufacturer = implantEntry.manufacturer;
  }
  if (implant.udi) {
    device.udiCarrier = [{ carrierHRF: implant.udi }];
  }
  if (implant.lotBatchNumber) {
    device.lotNumber = implant.lotBatchNumber;
  }
  if (implant.catalogueNumber) {
    device.modelNumber = implant.catalogueNumber;
  }
  const properties: Record<string, unknown>[] = [];
  if (implant.jointType) {
    properties.push({
      type: { text: "jointType" },
      valueCode: [
        {
          text: JOINT_TYPE_LABELS[implant.jointType],
        },
      ],
    });
  }
  if (implant.digit) {
    properties.push({
      type: { text: "digit" },
      valueCode: [
        {
          text: IMPLANT_DIGIT_LABELS[implant.digit],
        },
      ],
    });
  }
  if (implant.laterality) {
    properties.push({
      type: { text: "laterality" },
      valueCode: [
        {
          text: IMPLANT_LATERALITY_LABELS[implant.laterality],
        },
      ],
    });
  }
  if (properties.length > 0) {
    device.property = properties;
  }

  return device;
}

// ─── Patient ──────────────────────────────────────────────────────────────

function buildPatient(c: Case): FhirResource | null {
  const hasIdentity =
    c.patientFirstName || c.patientLastName || c.patientDateOfBirth || c.patientNhi;
  if (!hasIdentity) return null;

  const patient: FhirResource = {
    resourceType: "Patient",
    id: c.patientIdentifier,
  };

  if (c.patientFirstName || c.patientLastName) {
    patient.name = [
      {
        use: "official",
        ...(c.patientLastName ? { family: c.patientLastName } : {}),
        ...(c.patientFirstName ? { given: [c.patientFirstName] } : {}),
      },
    ];
  }

  if (c.patientDateOfBirth) {
    patient.birthDate = c.patientDateOfBirth;
  }

  if (c.patientNhi) {
    patient.identifier = [
      {
        system: "https://standards.digital.health.nz/ns/nhi-id",
        value: c.patientNhi,
      },
    ];
  }

  return patient;
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
      const procedure = buildProcedure(
        proc,
        group,
        c.patientIdentifier,
        c.procedureDate,
        c.ownerId,
        c,
      );

      // Attach Device resource for implant tracking
      const device = buildDevice(proc);
      if (device) {
        procedure.focalDevice = [
          {
            manipulated: { reference: `Device/${device.id}` },
          },
        ];
        entries.push({ resource: procedure });
        entries.push({ resource: device });
      } else {
        entries.push({ resource: procedure });
      }
    }
  }

  // Patient resource (when identity fields available)
  const patient = buildPatient(c);
  if (patient) {
    entries.unshift({ resource: patient });
  }

  // Encounter as container (first entry after Patient)
  const encounter = buildEncounter(c, conditionIds);
  entries.unshift({ resource: encounter });

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: c.updatedAt || new Date().toISOString(),
    entry: entries,
  };
}

export function exportCasesAsFhir(
  cases: Case[],
  episodes?: TreatmentEpisode[],
): string {
  const episodeEntries: FhirBundleEntry[] = (episodes || []).map((episode) => ({
    resource: buildEpisodeOfCare(episode),
  }));

  const masterBundle: FhirBundle = {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: [
      ...episodeEntries,
      ...cases.flatMap((c) => caseToFhirBundle(c).entry),
    ],
  };
  return JSON.stringify(masterBundle, null, 2);
}

export function exportSingleCaseAsFhir(c: Case): string {
  return JSON.stringify(caseToFhirBundle(c), null, 2);
}
