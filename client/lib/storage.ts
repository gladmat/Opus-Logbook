import AsyncStorage from "@react-native-async-storage/async-storage";
import { InteractionManager } from "react-native";
import {
  Case,
  TimelineEvent,
  CountryCode,
  ComplicationEntry,
  getAllProcedures,
  getCaseSpecialties,
  getPatientDisplayName,
  getPrimarySiteLabel,
  UnplannedReadmissionReason,
  UnplannedICUReason,
} from "@/types/case";
import type { CaseSummary } from "@/types/caseSummary";
import {
  isLegacyRole,
  migrateLegacyRole,
  type OperativeRole,
} from "@/types/operativeRole";
import { getCasePrimaryTitle } from "@/lib/caseDiagnosisSummary";
import {
  caseCanAddHistology,
  caseNeedsHistology,
  getSkinCancerCaseBadge,
} from "@/lib/skinCancerConfig";
import { INFECTION_SYNDROME_LABELS } from "@/types/infection";
import { encryptData, decryptData } from "./encryption";
import {
  canonicalizePersistedMediaUris,
  clearAllMediaStorage,
  deleteMultipleEncryptedMedia,
} from "./mediaStorage";
import * as Crypto from "expo-crypto";
import { normalizeTimelineEventDateOnlyFields } from "./dateFieldNormalization";
import { migrateCase, normalizeCaseDateOnlyFields } from "./migration";
import { repairCaseSpecialty } from "./caseSpecialty";
import {
  hashPatientIdentifierHmac,
  isLegacyHash,
} from "./patientIdentifierHmac";

const CASE_INDEX_KEY = "@surgical_logbook_case_index";
const CASE_PREFIX = "@surgical_logbook_case_";
const TIMELINE_KEY = "@surgical_logbook_timeline";
const USER_KEY = "@surgical_logbook_user";
const SETTINGS_KEY = "@surgical_logbook_settings";
const CASE_DRAFT_KEY_PREFIX = "@surgical_logbook_case_draft_";
const LEGACY_ENCRYPTED_CASES_KEY = "@surgical_logbook_cases_encrypted";
const LEGACY_CASES_KEY = "@surgical_logbook_cases";
const CASE_SPECIALTY_REPAIR_KEY = "@surgical_logbook_case_specialty_repair_v1";
const CASE_SUMMARIES_KEY = "@surgical_logbook_case_summaries_v1";
const CASE_SUMMARY_STORE_VERSION = 1;

export interface LocalUser {
  id: string;
  name: string;
  email?: string;
}

export interface AppSettings {
  countryCode: CountryCode;
  defaultFacility?: string;
  showLocalCodes: boolean;
  exportFormat: "json" | "csv" | "fhir";
}

export type CaseDraft = Partial<Case>;

interface CaseIndexEntry {
  id: string;
  procedureDate: string;
  patientIdentifierHash?: string;
  updatedAt: string;
  episodeId?: string;
  encounterClass?: string;
  caseStatus?: string;
  plannedDate?: string;
}

interface CaseSummaryStore {
  version: number;
  summaries: CaseSummary[];
}

function parseCaseSummaryStore(raw: string): CaseSummary[] | null {
  const parsed = JSON.parse(raw) as CaseSummaryStore | CaseSummary[];

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    parsed.version === CASE_SUMMARY_STORE_VERSION &&
    Array.isArray(parsed.summaries)
  ) {
    return parsed.summaries;
  }

  return null;
}

function serializeCaseSummaryStore(summaries: CaseSummary[]): string {
  return JSON.stringify({
    version: CASE_SUMMARY_STORE_VERSION,
    summaries,
  } satisfies CaseSummaryStore);
}

function resolveCaseOperativeRole(caseData: Case): OperativeRole | undefined {
  if (caseData.defaultOperativeRole) {
    return caseData.defaultOperativeRole;
  }

  const firstProcedure = getAllProcedures(caseData)[0];
  if (firstProcedure?.surgeonRole && isLegacyRole(firstProcedure.surgeonRole)) {
    return migrateLegacyRole(firstProcedure.surgeonRole).role;
  }

  const legacyRole = caseData.teamMembers?.find(
    (member) => member.id === caseData.ownerId,
  )?.role;
  if (legacyRole && isLegacyRole(legacyRole)) {
    return migrateLegacyRole(legacyRole).role;
  }

  return undefined;
}

function resolveSkinCancerBadge(caseData: Case): {
  label: string;
  colorKey: "error" | "warning" | "info" | "success";
} | null {
  let best: {
    label: string;
    colorKey: "error" | "warning" | "info" | "success";
  } | null = null;
  let bestPriority = Infinity;
  const badgePriority: Record<string, number> = {
    error: 0,
    warning: 1,
    info: 2,
    success: 3,
  };

  for (const group of caseData.diagnosisGroups ?? []) {
    if (group.skinCancerAssessment) {
      const badge = getSkinCancerCaseBadge(group.skinCancerAssessment);
      if (badge && (badgePriority[badge.colorKey] ?? 99) < bestPriority) {
        best = badge;
        bestPriority = badgePriority[badge.colorKey] ?? 99;
      }
    }

    for (const lesion of group.lesionInstances ?? []) {
      if (!lesion.skinCancerAssessment) {
        continue;
      }

      const badge = getSkinCancerCaseBadge(lesion.skinCancerAssessment);
      if (badge && (badgePriority[badge.colorKey] ?? 99) < bestPriority) {
        best = badge;
        bestPriority = badgePriority[badge.colorKey] ?? 99;
      }
    }
  }

  return best;
}

function buildCaseSummary(caseData: Case): CaseSummary {
  const primaryProcedureName =
    getAllProcedures(caseData)[0]?.procedureName || caseData.procedureType;
  const procedureNames = getAllProcedures(caseData)
    .map((procedure) => procedure.procedureName)
    .filter((name): name is string => Boolean(name));
  const diagnosisTitle =
    getCasePrimaryTitle(caseData) || caseData.procedureType;
  const patientDisplayName = getPatientDisplayName(caseData);
  const skinCancerBadge = resolveSkinCancerBadge(caseData);
  const infectionSyndrome = caseData.infectionOverlay?.syndromePrimary
    ? (INFECTION_SYNDROME_LABELS[caseData.infectionOverlay.syndromePrimary] ??
      caseData.infectionOverlay.syndromePrimary)
    : undefined;
  const hasSevereHandInfection =
    caseData.diagnosisGroups?.some(
      (group) =>
        group.handInfectionDetails &&
        !group.handInfectionDetails.escalatedToFullModule &&
        (group.handInfectionDetails.severity === "spreading" ||
          group.handInfectionDetails.severity === "systemic"),
    ) ?? false;

  return {
    id: caseData.id,
    procedureDate: caseData.procedureDate,
    createdAt: caseData.createdAt,
    updatedAt: caseData.updatedAt,
    patientIdentifier: caseData.patientIdentifier,
    patientFirstName: caseData.patientFirstName,
    patientLastName: caseData.patientLastName,
    patientDisplayName,
    patientNhi: caseData.patientNhi,
    facility: caseData.facility,
    specialty: caseData.specialty,
    specialties: getCaseSpecialties(caseData),
    caseStatus: caseData.caseStatus,
    plannedDate: caseData.plannedDate,
    plannedTemplateId: caseData.plannedTemplateId,
    plannedNote: caseData.plannedNote,
    episodeId: caseData.episodeId,
    encounterClass: caseData.encounterClass,
    stayType: caseData.stayType,
    dischargeDate: caseData.dischargeDate,
    outcomeRecorded: caseData.outcome != null,
    procedureType: caseData.procedureType,
    diagnosisTitle,
    primaryProcedureName,
    procedureNames,
    operativeMediaCount: caseData.operativeMedia?.length ?? 0,
    canAddHistology: caseCanAddHistology(caseData),
    needsHistology: caseNeedsHistology(caseData),
    infectionStatus: caseData.infectionOverlay?.status,
    infectionSyndrome,
    hasSevereHandInfection,
    operativeRole: resolveCaseOperativeRole(caseData),
    skinCancerBadgeLabel: skinCancerBadge?.label,
    skinCancerBadgeColorKey: skinCancerBadge?.colorKey,
    siteLabel: getPrimarySiteLabel(caseData) ?? undefined,
    searchableText: [
      caseData.patientIdentifier,
      caseData.patientFirstName,
      caseData.patientLastName,
      caseData.patientNhi,
      patientDisplayName,
      diagnosisTitle,
      primaryProcedureName,
      ...procedureNames,
      caseData.facility,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

/**
 * Hash a patient identifier using per-user HMAC-SHA256.
 * New hashes are prefixed with `hmac:`.
 */
export async function hashPatientIdentifier(
  patientIdentifier?: string,
): Promise<string | undefined> {
  if (!patientIdentifier) return undefined;
  return hashPatientIdentifierHmac(patientIdentifier);
}

/**
 * Legacy SHA-256 hash (no HMAC key). Used only for backward-compat
 * matching against old index entries during the migration period.
 */
async function legacyHashPatientIdentifier(
  patientIdentifier: string,
): Promise<string> {
  const normalized = patientIdentifier.toUpperCase().replace(/\s/g, "");
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalized,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

let indexMigrated = false;
let caseIndexCache: CaseIndexEntry[] | null = null;
const caseCache = new Map<string, Case>();
let allCasesCache: Case[] | null = null;
let caseSummaryCache: CaseSummary[] | null = null;

function clearCaseReadCaches(): void {
  caseIndexCache = null;
  allCasesCache = null;
  caseSummaryCache = null;
  caseCache.clear();
}

function cacheCase(caseData: Case): Case {
  caseCache.set(caseData.id, caseData);
  return caseData;
}

function getCachedCasesInIndexOrder(index: CaseIndexEntry[]): Case[] | null {
  const ordered = index
    .map((entry) => caseCache.get(entry.id))
    .filter((caseData): caseData is Case => caseData !== undefined);

  if (ordered.length !== index.length) {
    return null;
  }

  allCasesCache = ordered;
  return ordered;
}

async function migrateCaseIndexIfNeeded(
  entries: CaseIndexEntry[],
): Promise<CaseIndexEntry[]> {
  let changed = false;
  const migrated: CaseIndexEntry[] = [];

  for (const entry of entries) {
    const rawIdentifier = (entry as any).patientIdentifier as
      | string
      | undefined;
    let patientIdentifierHash = (entry as any).patientIdentifierHash as
      | string
      | undefined;

    if (!patientIdentifierHash && rawIdentifier) {
      patientIdentifierHash = await hashPatientIdentifier(rawIdentifier);
      changed = true;
    }

    if ((entry as any).patientIdentifier !== undefined) {
      changed = true;
    }

    migrated.push({
      id: entry.id,
      procedureDate: entry.procedureDate,
      patientIdentifierHash,
      updatedAt: entry.updatedAt,
    });
  }

  if (changed) {
    await saveCaseIndex(migrated);
  }

  return migrated;
}

async function getCaseIndex(): Promise<CaseIndexEntry[]> {
  if (caseIndexCache) {
    return caseIndexCache;
  }

  try {
    const data = await AsyncStorage.getItem(CASE_INDEX_KEY);
    if (data) {
      const parsed = JSON.parse(data) as CaseIndexEntry[];
      if (!indexMigrated) {
        const migrated = await migrateCaseIndexIfNeeded(parsed);
        indexMigrated = true;
        caseIndexCache = migrated;
        return migrated;
      }
      caseIndexCache = parsed;
      return parsed;
    }
    caseIndexCache = [];
    return [];
  } catch (error) {
    console.error("Error reading case index:", error);
    return [];
  }
}

async function saveCaseIndex(index: CaseIndexEntry[]): Promise<void> {
  caseIndexCache = index;
  allCasesCache = null;
  await AsyncStorage.setItem(CASE_INDEX_KEY, JSON.stringify(index));
}

async function migrateLegacyData(): Promise<boolean> {
  try {
    const legacyEncrypted = await AsyncStorage.getItem(
      LEGACY_ENCRYPTED_CASES_KEY,
    );
    if (legacyEncrypted) {
      const decrypted = await decryptData(legacyEncrypted);
      const cases: Case[] = JSON.parse(decrypted);

      const index: CaseIndexEntry[] = [];
      for (const caseData of cases) {
        const encrypted = await encryptData(JSON.stringify(caseData));
        await AsyncStorage.setItem(`${CASE_PREFIX}${caseData.id}`, encrypted);
        const patientIdentifierHash = await hashPatientIdentifier(
          caseData.patientIdentifier,
        );
        index.push({
          id: caseData.id,
          procedureDate: caseData.procedureDate,
          patientIdentifierHash,
          updatedAt:
            caseData.updatedAt ||
            caseData.createdAt ||
            new Date().toISOString(),
        });
      }

      index.sort(
        (a, b) =>
          new Date(b.procedureDate).getTime() -
          new Date(a.procedureDate).getTime(),
      );
      await saveCaseIndex(index);
      await AsyncStorage.removeItem(LEGACY_ENCRYPTED_CASES_KEY);
      clearCaseReadCaches();
      console.log(`Migrated ${cases.length} cases to per-case storage`);
      return true;
    }

    const legacyPlain = await AsyncStorage.getItem(LEGACY_CASES_KEY);
    if (legacyPlain) {
      const cases: Case[] = JSON.parse(legacyPlain);

      const index: CaseIndexEntry[] = [];
      for (const caseData of cases) {
        const encrypted = await encryptData(JSON.stringify(caseData));
        await AsyncStorage.setItem(`${CASE_PREFIX}${caseData.id}`, encrypted);
        const patientIdentifierHash = await hashPatientIdentifier(
          caseData.patientIdentifier,
        );
        index.push({
          id: caseData.id,
          procedureDate: caseData.procedureDate,
          patientIdentifierHash,
          updatedAt:
            caseData.updatedAt ||
            caseData.createdAt ||
            new Date().toISOString(),
        });
      }

      index.sort(
        (a, b) =>
          new Date(b.procedureDate).getTime() -
          new Date(a.procedureDate).getTime(),
      );
      await saveCaseIndex(index);
      await AsyncStorage.removeItem(LEGACY_CASES_KEY);
      clearCaseReadCaches();
      console.log(`Migrated ${cases.length} legacy cases to per-case storage`);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error migrating legacy data:", error);
    return false;
  }
}

let migrationChecked = false;
let specialtyRepairChecked = false;

async function writeStoredCasePreservingMetadata(
  caseData: Case,
): Promise<void> {
  const encrypted = await encryptData(JSON.stringify(caseData));
  await AsyncStorage.setItem(`${CASE_PREFIX}${caseData.id}`, encrypted);
}

async function repairStoredCaseSpecialtiesIfNeeded(): Promise<void> {
  if (specialtyRepairChecked) {
    return;
  }

  const repairMarker = await AsyncStorage.getItem(CASE_SPECIALTY_REPAIR_KEY);
  if (repairMarker === "1") {
    specialtyRepairChecked = true;
    return;
  }

  try {
    const index = await getCaseIndex();
    let changed = false;

    for (const entry of index) {
      const storageKey = `${CASE_PREFIX}${entry.id}`;
      const encrypted = await AsyncStorage.getItem(storageKey);
      if (!encrypted) {
        continue;
      }

      const decrypted = await decryptData(encrypted);
      const rawCase = JSON.parse(decrypted) as Case;
      const repairedCase = repairCaseSpecialty(migrateCase(rawCase));

      if (repairedCase.specialty === rawCase.specialty) {
        continue;
      }

      changed = true;
      await writeStoredCasePreservingMetadata({
        ...rawCase,
        specialty: repairedCase.specialty,
      });
    }

    if (changed) {
      caseSummaryCache = null;
      await AsyncStorage.removeItem(CASE_SUMMARIES_KEY);
    }

    await AsyncStorage.setItem(CASE_SPECIALTY_REPAIR_KEY, "1");
    specialtyRepairChecked = true;
  } catch (error) {
    console.error("Error repairing stored case specialties:", error);
  }
}

async function saveCaseSummaries(summaries: CaseSummary[]): Promise<void> {
  caseSummaryCache = summaries;
  const encrypted = await encryptData(serializeCaseSummaryStore(summaries));
  await AsyncStorage.setItem(CASE_SUMMARIES_KEY, encrypted);
}

async function rebuildCaseSummariesFromIndex(
  index: CaseIndexEntry[],
): Promise<CaseSummary[]> {
  const summaries: CaseSummary[] = [];
  for (const entry of index) {
    const caseData = await getCase(entry.id);
    if (caseData) {
      summaries.push(buildCaseSummary(caseData));
    }
  }
  await saveCaseSummaries(summaries);
  return summaries;
}

export async function getCaseSummaries(): Promise<CaseSummary[]> {
  try {
    if (!migrationChecked) {
      await migrateLegacyData();
      migrationChecked = true;
    }
    await repairStoredCaseSpecialtiesIfNeeded();

    const index = await getCaseIndex();
    if (index.length === 0) {
      caseSummaryCache = [];
      return [];
    }

    if (caseSummaryCache && caseSummaryCache.length === index.length) {
      return caseSummaryCache;
    }

    const stored = await AsyncStorage.getItem(CASE_SUMMARIES_KEY);
    if (stored) {
      try {
        const decrypted = await decryptData(stored);
        const summaries = parseCaseSummaryStore(decrypted);
        if (summaries && summaries.length === index.length) {
          const orderedSummaries = index
            .map((entry) =>
              summaries.find((summary) => summary.id === entry.id),
            )
            .filter((summary): summary is CaseSummary => summary != null);

          if (orderedSummaries.length === index.length) {
            caseSummaryCache = orderedSummaries;
            return orderedSummaries;
          }
        }
      } catch {
        // Rebuild from source cases below.
      }
    }

    return rebuildCaseSummariesFromIndex(index);
  } catch (error) {
    console.error("Error reading case summaries:", error);
    return [];
  }
}

// Yield to the UI thread so interactions remain responsive
function yieldToUI(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

export async function getCases(): Promise<Case[]> {
  try {
    if (!migrationChecked) {
      await migrateLegacyData();
      migrationChecked = true;
    }
    await repairStoredCaseSpecialtiesIfNeeded();

    const index = await getCaseIndex();
    if (index.length === 0) return [];
    if (allCasesCache && allCasesCache.length === index.length) {
      return allCasesCache;
    }

    const cachedCases = getCachedCasesInIndexOrder(index);
    if (cachedCases) {
      return cachedCases;
    }

    // Decrypt cases in small batches, yielding to UI between batches
    const BATCH_SIZE = 3;
    const results: (Case | null)[] = [];
    for (let i = 0; i < index.length; i += BATCH_SIZE) {
      const batch = index.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((entry) => getCase(entry.id)),
      );
      results.push(...batchResults);
      // Yield to the UI thread between batches so navigation/touches are processed
      if (i + BATCH_SIZE < index.length) {
        await yieldToUI();
      }
    }
    const hydratedCases = results.filter((c): c is Case => c !== null);
    allCasesCache = hydratedCases;
    return hydratedCases;
  } catch (error) {
    console.error("Error reading cases:", error);
    return [];
  }
}

export async function getCase(id: string): Promise<Case | null> {
  try {
    if (!migrationChecked) {
      await migrateLegacyData();
      migrationChecked = true;
    }
    await repairStoredCaseSpecialtiesIfNeeded();

    const cached = caseCache.get(id);
    if (cached) {
      return cached;
    }

    const encrypted = await AsyncStorage.getItem(`${CASE_PREFIX}${id}`);
    if (!encrypted) return null;

    const decrypted = await decryptData(encrypted);
    const caseData = migrateCase(JSON.parse(decrypted));

    // Lazy HMAC hash migration: upgrade SHA-256 → HMAC-SHA256 on load
    if (caseData?.patientIdentifier) {
      migrateHashIfNeeded(caseData.id, caseData.patientIdentifier).catch((e) =>
        console.error(
          "[storage] Hash migration failed for case:",
          caseData.id,
          e,
        ),
      );
    }

    return cacheCase(caseData);
  } catch (error) {
    console.error("Error reading case:", error);
    return null;
  }
}

export async function getCasesByIds(ids: string[]): Promise<Case[]> {
  if (ids.length === 0) {
    return [];
  }

  const cases = await Promise.all(ids.map((id) => getCase(id)));
  return cases.filter((caseData): caseData is Case => caseData !== null);
}

/**
 * If a case's index entry still has a legacy SHA-256 hash,
 * recompute with HMAC-SHA256 and update the index.
 */
async function migrateHashIfNeeded(
  caseId: string,
  patientIdentifier: string,
): Promise<void> {
  const index = await getCaseIndex();
  const entry = index.find((e) => e.id === caseId);
  if (!entry?.patientIdentifierHash) return;
  if (!isLegacyHash(entry.patientIdentifierHash)) return;

  const newHash = await hashPatientIdentifier(patientIdentifier);
  if (!newHash) return;

  entry.patientIdentifierHash = newHash;
  await saveCaseIndex(index);
}

export async function saveCase(caseData: Case): Promise<void> {
  try {
    const now = new Date().toISOString();
    const canonicalizedCase = await canonicalizePersistedMediaUris(caseData);
    const updatedCase = normalizeCaseDateOnlyFields({
      ...canonicalizedCase,
      updatedAt: now,
    });

    const encrypted = await encryptData(JSON.stringify(updatedCase));
    await AsyncStorage.setItem(`${CASE_PREFIX}${caseData.id}`, encrypted);
    const patientIdentifierHash = await hashPatientIdentifier(
      caseData.patientIdentifier,
    );

    const index = await getCaseIndex();
    const existingIdx = index.findIndex((e) => e.id === caseData.id);

    const indexEntry: CaseIndexEntry = {
      id: caseData.id,
      procedureDate: caseData.procedureDate,
      patientIdentifierHash,
      updatedAt: now,
      episodeId: caseData.episodeId,
      encounterClass: caseData.encounterClass,
      caseStatus: caseData.caseStatus,
      plannedDate: caseData.plannedDate,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = indexEntry;
    } else {
      index.unshift(indexEntry);
    }

    index.sort(
      (a, b) =>
        new Date(b.procedureDate).getTime() -
        new Date(a.procedureDate).getTime(),
    );
    await saveCaseIndex(index);
    const cachedCase = cacheCase(updatedCase);

    const summaries = await getCaseSummaries();
    const summary = buildCaseSummary(cachedCase);
    const existingSummaryIndex = summaries.findIndex(
      (item) => item.id === summary.id,
    );
    const nextSummaries = [...summaries];
    if (existingSummaryIndex >= 0) {
      nextSummaries[existingSummaryIndex] = summary;
    } else {
      nextSummaries.push(summary);
    }
    nextSummaries.sort(
      (left, right) =>
        new Date(right.procedureDate).getTime() -
        new Date(left.procedureDate).getTime(),
    );
    await saveCaseSummaries(nextSummaries);
  } catch (error) {
    console.error("Error saving case:", error);
    throw error;
  }
}

export async function getCaseCount(): Promise<number> {
  try {
    if (!migrationChecked) {
      await migrateLegacyData();
      migrationChecked = true;
    }
    await repairStoredCaseSpecialtiesIfNeeded();
    const index = await getCaseIndex();
    return index.length;
  } catch (error) {
    console.error("Error reading case count:", error);
    return 0;
  }
}

function getCaseDraftKey(specialty: Case["specialty"]): string {
  return `${CASE_DRAFT_KEY_PREFIX}${specialty}`;
}

export async function getCaseDraft(
  specialty: Case["specialty"],
): Promise<CaseDraft | null> {
  try {
    const data = await AsyncStorage.getItem(getCaseDraftKey(specialty));
    if (!data) return null;
    const decrypted = await decryptData(data);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Error reading case draft:", error);
    return null;
  }
}

export async function saveCaseDraft(
  specialty: Case["specialty"],
  draft: CaseDraft,
): Promise<void> {
  try {
    const canonicalizedDraft = await canonicalizePersistedMediaUris(draft);
    const encrypted = await encryptData(JSON.stringify(canonicalizedDraft));
    await AsyncStorage.setItem(getCaseDraftKey(specialty), encrypted);
  } catch (error) {
    console.error("Error saving case draft:", error);
    throw error;
  }
}

export async function clearCaseDraft(
  specialty: Case["specialty"],
): Promise<void> {
  try {
    await AsyncStorage.removeItem(getCaseDraftKey(specialty));
  } catch (error) {
    console.error("Error clearing case draft:", error);
    throw error;
  }
}

export async function updateCase(
  id: string,
  updates: Partial<Case>,
): Promise<void> {
  try {
    const existing = await getCase(id);
    if (!existing) return;

    const updatedCase = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await saveCase(updatedCase);
  } catch (error) {
    console.error("Error updating case:", error);
    throw error;
  }
}

export function getCasesPendingFollowUp(cases: Case[]): Case[] {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return cases.filter((c) => {
    if (c.complicationsReviewed) return false;
    const procedureDate = new Date(c.procedureDate);
    return procedureDate <= thirtyDaysAgo;
  });
}

export async function markNoComplications(
  caseId: string,
  auditFields?: {
    unplannedReadmission?: UnplannedReadmissionReason;
    unplannedICU?: UnplannedICUReason;
    returnToTheatre?: boolean;
    returnToTheatreReason?: string;
  },
): Promise<void> {
  await updateCase(caseId, {
    complicationsReviewed: true,
    complicationsReviewedAt: new Date().toISOString(),
    hasComplications: false,
    complications: [],
    ...auditFields,
  });
}

export async function findCasesByPatientId(patientId: string): Promise<Case[]> {
  const index = await getCaseIndex();
  const hmacHash = await hashPatientIdentifier(patientId);
  if (!hmacHash) return [];

  // Also compute legacy SHA-256 for backward compat with un-migrated entries
  const legacyHash = await legacyHashPatientIdentifier(patientId);

  const matchingEntries = index.filter((e) => {
    if (!e.patientIdentifierHash) return false;
    return (
      e.patientIdentifierHash === hmacHash ||
      e.patientIdentifierHash === legacyHash
    );
  });

  const cases = await Promise.all(
    matchingEntries.map((entry) => getCase(entry.id)),
  );
  return cases.filter((caseData): caseData is Case => caseData !== null);
}

export async function findCaseByPatientIdAndDate(
  patientId: string,
  procedureDate: string,
): Promise<Case | null> {
  const matches = await findCasesByPatientId(patientId);
  if (matches.length === 0) return null;

  const targetDate = new Date(procedureDate).toDateString();
  const exactMatch = matches.find((c) => {
    const caseDate = new Date(c.procedureDate).toDateString();
    return caseDate === targetDate;
  });

  if (exactMatch) return exactMatch;

  const withinWeek = matches.filter((c) => {
    const caseDate = new Date(c.procedureDate);
    const target = new Date(procedureDate);
    const diffDays =
      Math.abs(caseDate.getTime() - target.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  });

  if (withinWeek.length === 1) return withinWeek[0] ?? null;

  return null;
}

export async function recordComplications(
  caseId: string,
  complications: ComplicationEntry[],
): Promise<void> {
  await updateCase(caseId, {
    complicationsReviewed: true,
    complicationsReviewedAt: new Date().toISOString(),
    hasComplications: complications.length > 0,
    complications,
  });
}

export async function deleteCase(id: string): Promise<void> {
  try {
    const caseData = await getCase(id);
    if (caseData?.operativeMedia) {
      const mediaUris = caseData.operativeMedia.map((m) => m.localUri);
      await deleteMultipleEncryptedMedia(mediaUris);
    }

    await AsyncStorage.removeItem(`${CASE_PREFIX}${id}`);

    const index = await getCaseIndex();
    const filtered = index.filter((e) => e.id !== id);
    await saveCaseIndex(filtered);
    caseCache.delete(id);
    allCasesCache = null;

    const summaries = await getCaseSummaries();
    await saveCaseSummaries(summaries.filter((summary) => summary.id !== id));

    const events = await getTimelineEvents(id);
    for (const event of events) {
      if (event.mediaAttachments) {
        const eventMediaUris = event.mediaAttachments.map((m) => m.localUri);
        await deleteMultipleEncryptedMedia(eventMediaUris);
      }
      await deleteTimelineEvent(event.id);
    }
  } catch (error) {
    console.error("Error deleting case:", error);
    throw error;
  }
}

export async function getTimelineEvents(
  caseId: string,
): Promise<TimelineEvent[]> {
  try {
    const data = await AsyncStorage.getItem(TIMELINE_KEY);
    if (!data) return [];
    const decrypted = await decryptData(data);
    const allEvents = (JSON.parse(decrypted) as TimelineEvent[]).map(
      normalizeTimelineEventDateOnlyFields,
    );
    return allEvents
      .filter((e) => e.caseId === caseId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  } catch (error) {
    console.error("Error reading timeline events:", error);
    return [];
  }
}

export async function saveTimelineEvent(event: TimelineEvent): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(TIMELINE_KEY);
    let events: TimelineEvent[] = [];
    if (data) {
      const decrypted = await decryptData(data);
      events = JSON.parse(decrypted);
    }
    const canonicalizedEvent = await canonicalizePersistedMediaUris(event);
    events.unshift(normalizeTimelineEventDateOnlyFields(canonicalizedEvent));
    const encrypted = await encryptData(JSON.stringify(events));
    await AsyncStorage.setItem(TIMELINE_KEY, encrypted);
  } catch (error) {
    console.error("Error saving timeline event:", error);
    throw error;
  }
}

export async function updateTimelineEvent(
  id: string,
  updates: Partial<TimelineEvent>,
): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(TIMELINE_KEY);
    if (!data) return;
    const decrypted = await decryptData(data);
    const events: TimelineEvent[] = JSON.parse(decrypted);
    const index = events.findIndex((e) => e.id === id);
    if (index < 0) return;
    const canonicalizedEvent = await canonicalizePersistedMediaUris({
      ...events[index]!,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    events[index] = normalizeTimelineEventDateOnlyFields(canonicalizedEvent);
    const encrypted = await encryptData(JSON.stringify(events));
    await AsyncStorage.setItem(TIMELINE_KEY, encrypted);
  } catch (error) {
    console.error("Error updating timeline event:", error);
    throw error;
  }
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(TIMELINE_KEY);
    if (!data) return;
    const decrypted = await decryptData(data);
    const events: TimelineEvent[] = JSON.parse(decrypted);
    const filtered = events.filter((e) => e.id !== id);
    const encrypted = await encryptData(JSON.stringify(filtered));
    await AsyncStorage.setItem(TIMELINE_KEY, encrypted);
  } catch (error) {
    console.error("Error deleting timeline event:", error);
    throw error;
  }
}

export async function getLocalUser(): Promise<LocalUser | null> {
  try {
    const data = await AsyncStorage.getItem(USER_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading user:", error);
    return null;
  }
}

export async function saveLocalUser(user: LocalUser): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Error saving user:", error);
    throw error;
  }
}

export async function clearLocalUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error("Error clearing user:", error);
    throw error;
  }
}

export async function getSettings(): Promise<AppSettings | null> {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading settings:", error);
    return null;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

export async function exportCasesAsJSON(): Promise<string> {
  try {
    const cases = await getCases();
    return JSON.stringify(cases, null, 2);
  } catch (error) {
    console.error("Error exporting cases:", error);
    throw error;
  }
}

export async function getCasesByEpisodeId(episodeId: string): Promise<Case[]> {
  try {
    const index = await getCaseIndex();
    const matching = index.filter((e) => e.episodeId === episodeId);
    if (matching.length === 0) return [];

    const results = await Promise.all(
      matching.map((entry) => getCase(entry.id)),
    );
    return results
      .filter((c): c is Case => c !== null)
      .sort(
        (a, b) =>
          new Date(a.procedureDate).getTime() -
          new Date(b.procedureDate).getTime(),
      );
  } catch (error) {
    console.error("Error reading cases by episode:", error);
    return [];
  }
}

export async function getLatestCaseForEpisode(
  episodeId: string,
): Promise<Case | null> {
  try {
    const index = await getCaseIndex();
    const matching = index
      .filter((e) => e.episodeId === episodeId)
      .sort(
        (a, b) =>
          new Date(b.procedureDate).getTime() -
          new Date(a.procedureDate).getTime(),
      );
    if (matching.length === 0) return null;
    return getCase(matching[0]!.id);
  } catch (error) {
    console.error("Error reading latest case for episode:", error);
    return null;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    const index = await getCaseIndex();
    for (const entry of index) {
      await AsyncStorage.removeItem(`${CASE_PREFIX}${entry.id}`);
    }
    await AsyncStorage.removeItem(CASE_INDEX_KEY);
    await AsyncStorage.removeItem(TIMELINE_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem(SETTINGS_KEY);
    await AsyncStorage.removeItem(LEGACY_ENCRYPTED_CASES_KEY);
    await AsyncStorage.removeItem(LEGACY_CASES_KEY);
    await AsyncStorage.removeItem(CASE_SPECIALTY_REPAIR_KEY);
    await AsyncStorage.removeItem(CASE_SUMMARIES_KEY);
    const draftKeys = (await AsyncStorage.getAllKeys()).filter((key) =>
      key.startsWith(CASE_DRAFT_KEY_PREFIX),
    );
    if (draftKeys.length > 0) {
      await AsyncStorage.multiRemove(draftKeys);
    }
    await clearAllMediaStorage();
    indexMigrated = false;
    migrationChecked = false;
    specialtyRepairChecked = false;
    clearCaseReadCaches();
  } catch (error) {
    console.error("Error clearing all data:", error);
    throw error;
  }
}
