// Dev-only audit fixture seeder.
//
// `opus://debug/seed` populates on-device storage with a small, varied set of
// cases (+ one treatment episode) so the data-dependent surfaces — CaseDetail,
// EpisodeList/Detail, NeedsAttentionList, the populated Dashboard and
// Statistics tabs — can be visually audited without hand-driving the case form
// six times. Cases are encrypted on-device only; there is no server seed path.
//
// Tree-shaken from production: the sole call site (DevDeepLinkHandler) guards on
// `__DEV__`. Stable fixture IDs make re-running idempotent — `saveCase` /
// `saveEpisode` replace-by-id rather than duplicating.
//
// Trigger from the host:  xcrun simctl openurl booted "opus://debug/seed"
import { saveCase } from "@/lib/storage";
import { saveEpisode } from "@/lib/episodeStorage";
import { getActiveUserIdOrNull } from "@/lib/activeUser";
import { toIsoDateValue } from "@/lib/dateValues";
import type { Case, DiagnosisGroup, TeamMember } from "@/types/case";
import type { TreatmentEpisode } from "@/types/episode";

function dateOnly(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return toIsoDateValue(d);
}

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function youTeam(key: string, daysAgo: number): TeamMember[] {
  return [
    {
      id: `seed-tm-${key}`,
      name: "You",
      role: "PS",
      confirmed: true,
      addedAt: ts(daysAgo),
    },
  ];
}

const CANCER_EPISODE_ID = "seed-ep-cancer-001";

export async function seedAuditCases(): Promise<{
  cases: number;
  episodes: number;
}> {
  const ownerId = getActiveUserIdOrNull();
  if (!ownerId) {
    throw new Error("seedAuditCases: no active user — sign in first");
  }

  const facility = "Waikato Hospital";

  // ── 1. Hand & Wrist — distal radius fracture, day case, discharged ────────
  const handGroup: DiagnosisGroup = {
    id: "seed-dg-hand",
    sequenceOrder: 0,
    specialty: "hand_wrist",
    diagnosisPicklistId: "hand_dx_distal_radius_fx",
    diagnosis: {
      snomedCtCode: "263199001",
      displayName: "Distal radius fracture",
    },
    procedureSuggestionSource: "picklist",
    procedures: [
      {
        id: "seed-pr-hand-1",
        sequenceOrder: 0,
        procedureName: "Distal radius ORIF (volar plate)",
        specialty: "hand_wrist",
        snomedCtCode: "2811000032106",
        snomedCtDisplay: "Open reduction and internal fixation of fracture",
      },
    ],
  };

  // ── 2. Skin Cancer — excision biopsy awaiting histology, episode-linked ───
  const skinGroup: DiagnosisGroup = {
    id: "seed-dg-skin",
    sequenceOrder: 0,
    specialty: "skin_cancer",
    diagnosisPicklistId: "sc_dx_skin_lesion_excision_biopsy",
    diagnosis: {
      snomedCtCode: "95324001",
      displayName: "Skin lesion — excision biopsy (awaiting histology)",
    },
    diagnosisCertainty: "clinical",
    clinicalSuspicion: "suspect_bcc",
    procedureSuggestionSource: "skinCancer",
    procedures: [
      {
        id: "seed-pr-skin-1",
        sequenceOrder: 0,
        procedureName: "Skin lesion excision (diagnostic)",
        specialty: "skin_cancer",
        snomedCtCode: "172812009",
        snomedCtDisplay: "Excision of lesion of skin",
      },
    ],
  };

  // ── 3. Breast — invasive cancer + DIEP, inpatient (not yet discharged) ────
  const breastGroup: DiagnosisGroup = {
    id: "seed-dg-breast",
    sequenceOrder: 0,
    specialty: "breast",
    diagnosisPicklistId: "breast_dx_invasive_cancer",
    diagnosis: {
      snomedCtCode: "254837009",
      displayName: "Breast cancer — invasive",
    },
    procedureSuggestionSource: "picklist",
    procedures: [
      {
        id: "seed-pr-breast-1",
        sequenceOrder: 0,
        procedureName: "DIEP flap breast reconstruction",
        specialty: "breast",
        snomedCtCode: "395167000",
        snomedCtDisplay: "Deep inferior epigastric perforator flap",
      },
    ],
  };

  // ── 4. Burns — acute burn, discharged ────────────────────────────────────
  const burnsGroup: DiagnosisGroup = {
    id: "seed-dg-burns",
    sequenceOrder: 0,
    specialty: "burns",
    diagnosisPicklistId: "burns_dx_acute",
    diagnosis: {
      snomedCtCode: "284196006",
      displayName: "Acute burn",
    },
    procedureSuggestionSource: "picklist",
    procedures: [
      {
        id: "seed-pr-burns-1",
        sequenceOrder: 0,
        procedureName: "Split-thickness skin graft (STSG) — meshed",
        specialty: "burns",
        snomedCtCode: "265675003",
        snomedCtDisplay: "Split thickness skin graft",
      },
    ],
  };

  // ── 5. Orthoplastic — open lower-leg fracture + flap, discharged ──────────
  const orthoGroup: DiagnosisGroup = {
    id: "seed-dg-ortho",
    sequenceOrder: 0,
    specialty: "orthoplastic",
    diagnosisPicklistId: "orth_dx_open_fx_lower_leg",
    diagnosis: {
      snomedCtCode: "414942001",
      displayName: "Open fracture — lower leg (tibia / fibula)",
    },
    procedureSuggestionSource: "picklist",
    procedures: [
      {
        id: "seed-pr-ortho-1",
        sequenceOrder: 0,
        procedureName: "Surgical debridement",
        specialty: "orthoplastic",
        snomedCtCode: "36777000",
        snomedCtDisplay: "Debridement",
      },
      {
        id: "seed-pr-ortho-2",
        sequenceOrder: 1,
        procedureName: "Gastrocnemius flap (proximal defect)",
        specialty: "orthoplastic",
      },
    ],
  };

  // ── 6. General — necrotising fasciitis of trunk, discharged (last month) ──
  const generalGroup: DiagnosisGroup = {
    id: "seed-dg-general",
    sequenceOrder: 0,
    specialty: "general",
    diagnosisPicklistId: "gen_dx_nec_fasc_trunk",
    diagnosis: {
      snomedCtCode: "52486002",
      displayName: "Necrotizing fasciitis — trunk",
    },
    procedureSuggestionSource: "picklist",
    procedures: [
      {
        id: "seed-pr-general-1",
        sequenceOrder: 0,
        procedureName: "NSTI debridement (serial / radical)",
        specialty: "general",
        snomedCtCode: "36777000",
        snomedCtDisplay: "Debridement",
      },
    ],
  };

  const cases: Case[] = [
    {
      id: "seed-case-hand-001",
      patientIdentifier: "AUDIT-HAND-01",
      patientFirstName: "Eleanor",
      patientLastName: "Whitby",
      patientDateOfBirth: "1971-03-14",
      gender: "female",
      procedureDate: dateOnly(10),
      facility,
      specialty: "hand_wrist",
      procedureType: "Distal radius ORIF (volar plate)",
      diagnosisGroups: [handGroup],
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "INDEPENDENT",
      responsibleConsultantName: "Mr A. Consultant",
      admissionUrgency: "acute",
      stayType: "day_case",
      anaestheticType: "general",
      outcome: "discharged_home",
      dischargeDate: dateOnly(10),
      caseStatus: "discharged",
      clinicalDetails: {},
      teamMembers: youTeam("hand", 10),
      ownerId,
      createdAt: ts(10),
      updatedAt: ts(10),
    },
    {
      id: "seed-case-skin-001",
      patientIdentifier: "AUDIT-SKIN-02",
      patientFirstName: "George",
      patientLastName: "Tan",
      patientDateOfBirth: "1958-09-02",
      gender: "male",
      procedureDate: dateOnly(7),
      facility,
      specialty: "skin_cancer",
      procedureType: "Skin lesion excision (diagnostic)",
      diagnosisGroups: [skinGroup],
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "INDEPENDENT",
      stayType: "day_case",
      anaestheticType: "local",
      outcome: "discharged_home",
      dischargeDate: dateOnly(7),
      caseStatus: "discharged",
      episodeId: CANCER_EPISODE_ID,
      episodeSequence: 1,
      clinicalDetails: {},
      teamMembers: youTeam("skin", 7),
      ownerId,
      createdAt: ts(7),
      updatedAt: ts(7),
    },
    {
      id: "seed-case-breast-001",
      patientIdentifier: "AUDIT-BREAST-03",
      patientFirstName: "Priya",
      patientLastName: "Anand",
      patientDateOfBirth: "1979-11-21",
      gender: "female",
      procedureDate: dateOnly(2),
      facility,
      specialty: "breast",
      procedureType: "DIEP flap breast reconstruction",
      diagnosisGroups: [breastGroup],
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "SUP_AVAILABLE",
      responsibleConsultantName: "Ms B. Consultant",
      admissionUrgency: "elective",
      stayType: "inpatient",
      admissionDate: dateOnly(2),
      anaestheticType: "general",
      caseStatus: "active",
      clinicalDetails: {},
      teamMembers: youTeam("breast", 2),
      ownerId,
      createdAt: ts(2),
      updatedAt: ts(2),
    },
    {
      id: "seed-case-burns-001",
      patientIdentifier: "AUDIT-BURNS-04",
      patientFirstName: "Tama",
      patientLastName: "Reweti",
      patientDateOfBirth: "2001-06-30",
      gender: "male",
      procedureDate: dateOnly(5),
      facility,
      specialty: "burns",
      procedureType: "Split-thickness skin graft (STSG) — meshed",
      diagnosisGroups: [burnsGroup],
      defaultOperativeRole: "FIRST_ASST",
      defaultSupervisionLevel: "NOT_APPLICABLE",
      admissionUrgency: "acute",
      stayType: "inpatient",
      anaestheticType: "general",
      outcome: "discharged_home",
      dischargeDate: dateOnly(3),
      caseStatus: "discharged",
      clinicalDetails: {},
      teamMembers: youTeam("burns", 5),
      ownerId,
      createdAt: ts(5),
      updatedAt: ts(5),
    },
    {
      id: "seed-case-ortho-001",
      patientIdentifier: "AUDIT-ORTHO-05",
      patientFirstName: "Daniel",
      patientLastName: "Okafor",
      patientDateOfBirth: "1989-01-08",
      gender: "male",
      procedureDate: dateOnly(20),
      facility,
      specialty: "orthoplastic",
      procedureType: "Surgical debridement + gastrocnemius flap",
      diagnosisGroups: [orthoGroup],
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "SUP_SCRUBBED",
      responsibleConsultantName: "Mr A. Consultant",
      admissionUrgency: "acute",
      stayType: "inpatient",
      anaestheticType: "general",
      outcome: "discharged_home",
      dischargeDate: dateOnly(16),
      caseStatus: "discharged",
      clinicalDetails: {},
      teamMembers: youTeam("ortho", 20),
      ownerId,
      createdAt: ts(20),
      updatedAt: ts(20),
    },
    {
      id: "seed-case-general-001",
      patientIdentifier: "AUDIT-GEN-06",
      patientFirstName: "Margaret",
      patientLastName: "Hollis",
      patientDateOfBirth: "1965-04-19",
      gender: "female",
      procedureDate: dateOnly(35),
      facility,
      specialty: "general",
      procedureType: "NSTI debridement (serial / radical)",
      diagnosisGroups: [generalGroup],
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "INDEPENDENT",
      admissionUrgency: "acute",
      stayType: "inpatient",
      anaestheticType: "general",
      outcome: "discharged_home",
      dischargeDate: dateOnly(28),
      caseStatus: "discharged",
      clinicalDetails: {},
      teamMembers: youTeam("general", 35),
      ownerId,
      createdAt: ts(35),
      updatedAt: ts(35),
    },
  ];

  const episode: TreatmentEpisode = {
    id: CANCER_EPISODE_ID,
    patientIdentifier: "AUDIT-SKIN-02",
    title: "Skin lesion — cancer pathway",
    primaryDiagnosisCode: "95324001",
    primaryDiagnosisDisplay:
      "Skin lesion — excision biopsy (awaiting histology)",
    bodySite: "Left cheek",
    type: "cancer_pathway",
    specialty: "skin_cancer",
    status: "active",
    pendingAction: "awaiting_histology",
    onsetDate: dateOnly(7),
    notes:
      "Audit fixture episode — excision biopsy awaiting definitive histology.",
    ownerId,
    nextCaseSequence: 1,
    createdAt: ts(7),
    updatedAt: ts(7),
  };

  await saveEpisode(episode);
  for (const c of cases) {
    await saveCase(c);
  }

  return { cases: cases.length, episodes: 1 };
}
