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

import {
  Case,
  DiagnosisGroup,
  CaseProcedure,
  Laterality,
  type FreeFlapDetails,
} from "@/types/case";
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
  generateDupuytrenSummaryText,
  getFingerLabel,
  calculateDiathesisScore,
  getDominantPatternLabel,
} from "@/lib/dupuytrenHelpers";
import {
  DIGIT_LABELS,
  DIGIT_BODY_STRUCTURE_SNOMED,
} from "@/lib/diagnosisPicklists/multiDigitConfig";
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
import type {
  BreastAssessmentData,
  ImplantDetailsData,
  BreastLaterality,
} from "@/types/breast";
import {
  IMPLANT_SURFACE_LABELS,
  IMPLANT_FILL_LABELS,
  IMPLANT_SHAPE_LABELS,
  IMPLANT_PROFILE_LABELS,
  IMPLANT_PLANE_LABELS,
} from "@/types/breast";
import { getImplantManufacturerLabel } from "@/lib/breastConfig";

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
    ...(episode.breastReconstructionMeta
      ? {
          extension: [
            {
              url: "urn:opus:breast-reconstruction-meta",
              extension: [
                {
                  url: "laterality",
                  valueString: episode.breastReconstructionMeta.laterality,
                },
                ...(episode.breastReconstructionMeta.primaryReconstructionType
                  ? [
                      {
                        url: "primaryReconstructionType",
                        valueString:
                          episode.breastReconstructionMeta
                            .primaryReconstructionType,
                      },
                    ]
                  : []),
                ...(episode.breastReconstructionMeta.timingClassification
                  ? [
                      {
                        url: "timingClassification",
                        valueString:
                          episode.breastReconstructionMeta.timingClassification,
                      },
                    ]
                  : []),
              ],
            },
          ],
        }
      : {}),
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
    // Joint case context as extension
    ...(c.jointCaseContext?.isJointCase
      ? {
          extension: [
            {
              url: "urn:opus:joint-case-context",
              extension: [
                ...(c.jointCaseContext.partnerSpecialty
                  ? [
                      {
                        url: "partnerSpecialty",
                        valueString: c.jointCaseContext.partnerSpecialty,
                      },
                    ]
                  : []),
                ...(c.jointCaseContext.partnerConsultantName
                  ? [
                      {
                        url: "partnerConsultant",
                        valueString: c.jointCaseContext.partnerConsultantName,
                      },
                    ]
                  : []),
                ...(c.jointCaseContext.ablativeSurgeon
                  ? [
                      {
                        url: "ablativeSurgeon",
                        valueString: c.jointCaseContext.ablativeSurgeon,
                      },
                    ]
                  : []),
                ...(c.jointCaseContext.reconstructionSequence
                  ? [
                      {
                        url: "reconstructionSequence",
                        valueString: c.jointCaseContext.reconstructionSequence,
                      },
                    ]
                  : []),
                ...(c.jointCaseContext.ablativeProcedureDescription
                  ? [
                      {
                        url: "ablativeProcedureDescription",
                        valueString:
                          c.jointCaseContext.ablativeProcedureDescription,
                      },
                    ]
                  : []),
                ...(c.jointCaseContext.defectDimensions?.length != null
                  ? [
                      {
                        url: "defectLengthMm",
                        valueDecimal:
                          c.jointCaseContext.defectDimensions.length,
                      },
                    ]
                  : []),
                ...(c.jointCaseContext.defectDimensions?.width != null
                  ? [
                      {
                        url: "defectWidthMm",
                        valueDecimal: c.jointCaseContext.defectDimensions.width,
                      },
                    ]
                  : []),
                ...(c.jointCaseContext.defectDimensions?.depth != null
                  ? [
                      {
                        url: "defectDepthMm",
                        valueDecimal: c.jointCaseContext.defectDimensions.depth,
                      },
                    ]
                  : []),
                ...(c.jointCaseContext.structuresResected?.length
                  ? c.jointCaseContext.structuresResected.map((value) => ({
                      url: "structuresResected",
                      valueString: value,
                    }))
                  : []),
              ],
            },
          ],
        }
      : {}),
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
      ...(condition.extension ?? []),
      {
        url: "opus:handInfectionDetails",
        extension: extensions,
      },
    ];
  }

  // Affected fingers extension
  if (group.affectedFingers && group.affectedFingers.length > 0) {
    condition.extension = [
      ...(condition.extension ?? []),
      {
        url: "opus:affectedFingers",
        extension: group.affectedFingers.map((f) => ({
          url: "finger",
          valueString: f,
        })),
      },
    ];
  }

  // Affected digits extension (multi-digit diagnoses like trigger digit)
  if (group.affectedDigits && group.affectedDigits.length > 0) {
    condition.extension = [
      ...(condition.extension ?? []),
      {
        url: "opus:affectedDigits",
        extension: group.affectedDigits.map((d) => ({
          url: "digit",
          valueString: DIGIT_LABELS[d],
        })),
      },
    ];
  }

  // Dupuytren assessment extension
  if (group.dupuytrenAssessment && group.dupuytrenAssessment.rays.length > 0) {
    const da = group.dupuytrenAssessment;
    const dupuytrenExtensions: { url: string; valueString: string }[] = [
      {
        url: "summary",
        valueString: generateDupuytrenSummaryText(da),
      },
    ];
    for (const ray of da.rays) {
      dupuytrenExtensions.push({
        url: "ray",
        valueString: `${getFingerLabel(ray.fingerId)}: MCP ${ray.mcpExtensionDeficit}° PIP ${ray.pipExtensionDeficit}°${ray.dipExtensionDeficit ? ` DIP ${ray.dipExtensionDeficit}°` : ""} total ${ray.totalExtensionDeficit}° Tubiana ${ray.tubianaStage}`,
      });
    }
    if (da.isRevision) {
      dupuytrenExtensions.push({ url: "isRevision", valueString: "true" });
    }
    if (da.firstWebSpace?.isAffected) {
      dupuytrenExtensions.push({
        url: "firstWebSpaceAffected",
        valueString: "true",
      });
    }
    if (da.totalHandScore != null) {
      dupuytrenExtensions.push({
        url: "totalHandScore",
        valueString: String(da.totalHandScore),
      });
    }
    if (da.dominantPattern) {
      dupuytrenExtensions.push({
        url: "dominantPattern",
        valueString: getDominantPatternLabel(da.dominantPattern),
      });
    }
    if (da.diathesis && calculateDiathesisScore(da.diathesis) > 0) {
      dupuytrenExtensions.push({
        url: "diathesisScore",
        valueString: `${calculateDiathesisScore(da.diathesis)}/4`,
      });
    }
    condition.extension = [
      ...(condition.extension ?? []),
      {
        url: "opus:dupuytrenAssessment",
        extension: dupuytrenExtensions,
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

  // Breast assessment laterality extension
  if (group.breastAssessment?.laterality) {
    const breastExt = {
      url: "urn:opus:breast-laterality",
      valueString: group.breastAssessment.laterality,
    };
    if (procedure.extension) {
      procedure.extension.push(breastExt);
    } else {
      procedure.extension = [breastExt];
    }
  }

  if (
    (proc.specialty ?? group.specialty) === "head_neck" &&
    proc.tags?.includes("free_flap") &&
    proc.clinicalDetails
  ) {
    const freeFlapDetails = proc.clinicalDetails as FreeFlapDetails;
    const recipientVesselQuality =
      freeFlapDetails.recipientVesselQuality ??
      (freeFlapDetails.irradiatedVesselPreference === "vein_graft_required"
        ? "irradiated_vein_graft_required"
        : freeFlapDetails.irradiatedNeckDissectionPerformed
          ? "previously_operated"
          : freeFlapDetails.irradiatedVesselPreference ===
                "ipsilateral_viable" ||
              (freeFlapDetails.irradiatedVesselStatus &&
                freeFlapDetails.irradiatedVesselStatus !== "normal")
            ? "irradiated_usable"
            : freeFlapDetails.irradiatedVesselStatus === "normal" ||
                freeFlapDetails.irradiatedVesselPreference === "contralateral"
              ? "normal"
              : undefined);
    const veinGraftUsed =
      freeFlapDetails.veinGraftUsed ??
      freeFlapDetails.irradiatedVesselPreference === "vein_graft_required";
    const headNeckExtensions: Record<string, unknown>[] = [];

    if (recipientVesselQuality) {
      headNeckExtensions.push({
        url: "recipientVesselQuality",
        valueString: recipientVesselQuality,
      });
    }
    if (veinGraftUsed !== undefined) {
      headNeckExtensions.push({
        url: "veinGraftUsed",
        valueBoolean: veinGraftUsed,
      });
    }
    if (freeFlapDetails.veinGraftSource) {
      headNeckExtensions.push({
        url: "veinGraftSource",
        valueString: freeFlapDetails.veinGraftSource,
      });
    }
    if (freeFlapDetails.veinGraftLength != null) {
      headNeckExtensions.push({
        url: "veinGraftLengthCm",
        valueDecimal: freeFlapDetails.veinGraftLength,
      });
    }
    if (freeFlapDetails.flapSpecificDetails?.fibulaBrownClass) {
      headNeckExtensions.push({
        url: "fibulaBrownClass",
        valueString: freeFlapDetails.flapSpecificDetails.fibulaBrownClass,
      });
    }
    if (freeFlapDetails.flapSpecificDetails?.fibulaMandibleSegments?.length) {
      headNeckExtensions.push(
        ...freeFlapDetails.flapSpecificDetails.fibulaMandibleSegments.map(
          (segment) => ({
            url: "fibulaMandibleSegment",
            valueString: segment,
          }),
        ),
      );
    }

    if (headNeckExtensions.length > 0) {
      const ext = {
        url: "urn:opus:head-neck-free-flap",
        extension: headNeckExtensions,
      };
      if (procedure.extension) {
        procedure.extension.push(ext);
      } else {
        procedure.extension = [ext];
      }
    }
  }

  // bodySite with procedure/implant-aware laterality and digit context
  const laterality = (proc.laterality ??
    proc.implantDetails?.laterality ??
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

  // Per-digit bodySite for multi-digit procedures (e.g., trigger finger release per digit)
  if (proc.digitId && DIGIT_BODY_STRUCTURE_SNOMED[proc.digitId] && !procedure.bodySite) {
    const digitSnomed = DIGIT_BODY_STRUCTURE_SNOMED[proc.digitId];
    const bodySiteEntry: Record<string, unknown> = {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: digitSnomed.code,
          display: digitSnomed.display,
        },
      ],
      text: DIGIT_LABELS[proc.digitId],
    };
    // Add laterality qualifier if available
    if (laterality && LATERALITY_SNOMED[laterality]) {
      (bodySiteEntry.coding as FhirCoding[]).push(LATERALITY_SNOMED[laterality]);
    }
    procedure.bodySite = [bodySiteEntry];
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

// ─── Breast Device ────────────────────────────────────────────────────────

function buildBreastDevice(
  implant: ImplantDetailsData,
  side: BreastLaterality,
  procedureId: string,
): FhirResource {
  const device: FhirResource = {
    resourceType: "Device",
    id: `breast-device-${side}-${procedureId}`,
    type: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "303608005",
          display: "Breast implant (physical object)",
        },
      ],
      text: implant.productName ?? "Breast implant",
    },
    status: "active",
  };

  if (implant.manufacturer) {
    device.manufacturer = getImplantManufacturerLabel(implant.manufacturer);
  }
  if (implant.serialNumber) {
    device.serialNumber = implant.serialNumber;
  }
  if (implant.udi) {
    device.udiCarrier = [{ carrierHRF: implant.udi }];
  }
  if (implant.lotNumber) device.lotNumber = implant.lotNumber;
  if (implant.catalogReference) device.modelNumber = implant.catalogReference;

  const properties: Record<string, unknown>[] = [];
  if (implant.volumeCc != null) {
    properties.push({
      type: { text: "volumeCc" },
      valueQuantity: [{ value: implant.volumeCc, unit: "cc" }],
    });
  }
  if (implant.shellSurface) {
    properties.push({
      type: { text: "surface" },
      valueCode: [{ text: IMPLANT_SURFACE_LABELS[implant.shellSurface] }],
    });
  }
  if (implant.shape) {
    properties.push({
      type: { text: "shape" },
      valueCode: [{ text: IMPLANT_SHAPE_LABELS[implant.shape] }],
    });
  }
  if (implant.profile) {
    properties.push({
      type: { text: "profile" },
      valueCode: [{ text: IMPLANT_PROFILE_LABELS[implant.profile] }],
    });
  }
  if (implant.implantPlane) {
    properties.push({
      type: { text: "plane" },
      valueCode: [{ text: IMPLANT_PLANE_LABELS[implant.implantPlane] }],
    });
  }
  if (implant.fillMaterial) {
    properties.push({
      type: { text: "fill" },
      valueCode: [{ text: IMPLANT_FILL_LABELS[implant.fillMaterial] }],
    });
  }
  properties.push({
    type: { text: "side" },
    valueCode: [{ text: side === "left" ? "Left" : "Right" }],
  });
  if (properties.length > 0) device.property = properties;

  return device;
}

function getBreastDevicesForGroup(
  group: DiagnosisGroup,
): { device: FhirResource; side: BreastLaterality }[] {
  const ba: BreastAssessmentData | undefined = group.breastAssessment;
  if (!ba) return [];

  const results: { device: FhirResource; side: BreastLaterality }[] = [];
  for (const side of ["left", "right"] as BreastLaterality[]) {
    const sideData = ba.sides[side];
    if (sideData?.implantDetails?.deviceType) {
      results.push({
        device: buildBreastDevice(sideData.implantDetails, side, group.id),
        side,
      });
    }
  }
  return results;
}

// ─── Patient ──────────────────────────────────────────────────────────────

function buildPatient(c: Case): FhirResource | null {
  const hasIdentity =
    c.patientFirstName ||
    c.patientLastName ||
    c.patientDateOfBirth ||
    c.patientNhi;
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
    const breastDevices = getBreastDevicesForGroup(group);
    let breastDevicesAttached = false;

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

      const focalDevices: { manipulated: { reference: string } }[] = [];
      const relatedResources: FhirResource[] = [];

      // Attach Device resource for joint implant tracking
      const device = buildDevice(proc);
      if (device) {
        focalDevices.push({
          manipulated: { reference: `Device/${device.id}` },
        });
        relatedResources.push(device);
      }

      if (!breastDevicesAttached && breastDevices.length > 0) {
        focalDevices.push(
          ...breastDevices.map(({ device: breastDevice }) => ({
            manipulated: { reference: `Device/${breastDevice.id}` },
          })),
        );
        relatedResources.push(
          ...breastDevices.map(({ device: breastDevice }) => breastDevice),
        );
        breastDevicesAttached = true;
      }

      if (focalDevices.length > 0) {
        procedure.focalDevice = focalDevices;
      }

      entries.push({ resource: procedure });
      for (const resource of relatedResources) {
        entries.push({ resource });
      }
    }

    if (!breastDevicesAttached) {
      for (const { device: breastDevice } of breastDevices) {
        entries.push({ resource: breastDevice });
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
