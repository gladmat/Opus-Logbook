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
import type { OperativeRole } from "@/types/operativeRole";
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
import { normalizeTimelineEventDateOnlyFields } from "./dateFieldNormalization";
import {
  normalizeCaseDateOnlyFields,
  normalizeCaseBreastFields,
} from "./caseNormalization";
import { hashPatientIdentifierHmac } from "./patientIdentifierHmac";
import { userScopedAsyncKey } from "./activeUser";

// Base key names — scoped per user at runtime via userScopedAsyncKey()
export const STORAGE_BASE_KEYS = {
  CASE_INDEX: "@surgical_logbook_case_index",
  CASE_PREFIX: "@surgical_logbook_case_",
  TIMELINE: "@surgical_logbook_timeline",
  USER: "@surgical_logbook_user",
  SETTINGS: "@surgical_logbook_settings",
  CASE_DRAFT_PREFIX: "@surgical_logbook_case_draft_",
  CASE_SUMMARIES: "@surgical_logbook_case_summaries_v1",
} as const;

function caseIndexKey(): string {
  return userScopedAsyncKey(STORAGE_BASE_KEYS.CASE_INDEX);
}
function caseKey(caseId: string): string {
  return userScopedAsyncKey(`${STORAGE_BASE_KEYS.CASE_PREFIX}${caseId}`);
}
function timelineKey(): string {
  return userScopedAsyncKey(STORAGE_BASE_KEYS.TIMELINE);
}
function userKey(): string {
  return userScopedAsyncKey(STORAGE_BASE_KEYS.USER);
}
function settingsKey(): string {
  return userScopedAsyncKey(STORAGE_BASE_KEYS.SETTINGS);
}
function caseDraftKey(specialty: string): string {
  return userScopedAsyncKey(
    `${STORAGE_BASE_KEYS.CASE_DRAFT_PREFIX}${specialty}`,
  );
}
function caseSummariesKey(): string {
  return userScopedAsyncKey(STORAGE_BASE_KEYS.CASE_SUMMARIES);
}
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
  return caseData.defaultOperativeRole;
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
    firstOperativeMediaUri: caseData.operativeMedia?.[0]?.localUri,
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

async function getCaseIndex(): Promise<CaseIndexEntry[]> {
  if (caseIndexCache) {
    return caseIndexCache;
  }

  try {
    const data = await AsyncStorage.getItem(caseIndexKey());
    if (data) {
      const parsed = JSON.parse(data) as CaseIndexEntry[];
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
  await AsyncStorage.setItem(caseIndexKey(), JSON.stringify(index));
}


async function saveCaseSummaries(summaries: CaseSummary[]): Promise<void> {
  caseSummaryCache = summaries;
  const encrypted = await encryptData(serializeCaseSummaryStore(summaries));
  await AsyncStorage.setItem(caseSummariesKey(), encrypted);
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
    const index = await getCaseIndex();
    if (index.length === 0) {
      caseSummaryCache = [];
      return [];
    }

    if (caseSummaryCache && caseSummaryCache.length === index.length) {
      return caseSummaryCache;
    }

    const stored = await AsyncStorage.getItem(caseSummariesKey());
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
    const cached = caseCache.get(id);
    if (cached) {
      return cached;
    }

    const encrypted = await AsyncStorage.getItem(caseKey(id));
    if (!encrypted) return null;

    const decrypted = await decryptData(encrypted);
    const caseData = JSON.parse(decrypted) as Case;

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

  const BATCH_SIZE = 4;
  const results: (Case | null)[] = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const cases = await Promise.all(batch.map((id) => getCase(id)));
    results.push(...cases);

    if (i + BATCH_SIZE < ids.length) {
      await yieldToUI();
    }
  }

  return results.filter((caseData): caseData is Case => caseData !== null);
}

export async function saveCase(caseData: Case): Promise<void> {
  try {
    const now = new Date().toISOString();
    const canonicalizedCase = await canonicalizePersistedMediaUris(caseData);
    const updatedCase = normalizeCaseBreastFields(
      normalizeCaseDateOnlyFields({
        ...canonicalizedCase,
        updatedAt: now,
      }),
    );

    const encrypted = await encryptData(JSON.stringify(updatedCase));
    const patientIdentifierHash = await hashPatientIdentifier(
      caseData.patientIdentifier,
    );

    // Invalidate cache before read-modify-write to avoid stale reads
    caseIndexCache = null;
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

    const encryptedSummaries = await encryptData(
      JSON.stringify({
        version: CASE_SUMMARY_STORE_VERSION,
        summaries: nextSummaries,
      }),
    );

    // Atomic write: case data + index + summaries in a single multiSet call
    await AsyncStorage.multiSet([
      [caseKey(caseData.id), encrypted],
      [caseIndexKey(), JSON.stringify(index)],
      [caseSummariesKey(), encryptedSummaries],
    ]);

    // Update in-memory caches after successful write
    caseIndexCache = index;
    caseSummaryCache = nextSummaries;
  } catch (error) {
    console.error("Error saving case:", error);
    throw error;
  }
}

export async function getCaseCount(): Promise<number> {
  try {
    const index = await getCaseIndex();
    return index.length;
  } catch (error) {
    console.error("Error reading case count:", error);
    return 0;
  }
}

export async function getCaseDraft(
  specialty: Case["specialty"],
): Promise<CaseDraft | null> {
  try {
    const data = await AsyncStorage.getItem(caseDraftKey(specialty));
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
    await AsyncStorage.setItem(caseDraftKey(specialty), encrypted);
  } catch (error) {
    console.error("Error saving case draft:", error);
    throw error;
  }
}

export async function clearCaseDraft(
  specialty: Case["specialty"],
): Promise<void> {
  try {
    await AsyncStorage.removeItem(caseDraftKey(specialty));
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

  const matchingEntries = index.filter((e) => {
    if (!e.patientIdentifierHash) return false;
    return e.patientIdentifierHash === hmacHash;
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

    // Delete media FIRST — if this fails, case data is still intact
    if (caseData?.operativeMedia) {
      const mediaUris = caseData.operativeMedia.map((m) => m.localUri);
      try {
        await deleteMultipleEncryptedMedia(mediaUris);
      } catch (mediaErr) {
        console.warn("Failed to delete some case media (orphaned):", mediaErr);
      }
    }

    // Delete timeline event media before removing events
    const events = await getTimelineEvents(id);
    for (const event of events) {
      if (event.mediaAttachments) {
        const eventMediaUris = event.mediaAttachments.map((m) => m.localUri);
        try {
          await deleteMultipleEncryptedMedia(eventMediaUris);
        } catch (mediaErr) {
          console.warn("Failed to delete some event media (orphaned):", mediaErr);
        }
      }
      await deleteTimelineEvent(event.id);
    }

    // Now remove case data, index entry, and summary atomically
    caseIndexCache = null; // Invalidate before read-modify-write
    const index = await getCaseIndex();
    const filtered = index.filter((e) => e.id !== id);

    const summaries = await getCaseSummaries();
    const filteredSummaries = summaries.filter((summary) => summary.id !== id);
    const encryptedSummaries = await encryptData(
      serializeCaseSummaryStore(filteredSummaries),
    );

    await AsyncStorage.multiSet([
      [caseIndexKey(), JSON.stringify(filtered)],
      [caseSummariesKey(), encryptedSummaries],
    ]);
    await AsyncStorage.removeItem(caseKey(id));

    // Update in-memory caches
    caseIndexCache = filtered;
    caseSummaryCache = filteredSummaries;
    caseCache.delete(id);
    allCasesCache = null;
  } catch (error) {
    console.error("Error deleting case:", error);
    throw error;
  }
}

export async function getTimelineEvents(
  caseId: string,
): Promise<TimelineEvent[]> {
  try {
    const data = await AsyncStorage.getItem(timelineKey());
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
    const data = await AsyncStorage.getItem(timelineKey());
    let events: TimelineEvent[] = [];
    if (data) {
      const decrypted = await decryptData(data);
      events = JSON.parse(decrypted);
    }
    const canonicalizedEvent = await canonicalizePersistedMediaUris(event);
    events.unshift(normalizeTimelineEventDateOnlyFields(canonicalizedEvent));
    const encrypted = await encryptData(JSON.stringify(events));
    await AsyncStorage.setItem(timelineKey(), encrypted);
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
    const data = await AsyncStorage.getItem(timelineKey());
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
    await AsyncStorage.setItem(timelineKey(), encrypted);
  } catch (error) {
    console.error("Error updating timeline event:", error);
    throw error;
  }
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(timelineKey());
    if (!data) return;
    const decrypted = await decryptData(data);
    const events: TimelineEvent[] = JSON.parse(decrypted);
    const filtered = events.filter((e) => e.id !== id);
    const encrypted = await encryptData(JSON.stringify(filtered));
    await AsyncStorage.setItem(timelineKey(), encrypted);
  } catch (error) {
    console.error("Error deleting timeline event:", error);
    throw error;
  }
}

export async function getLocalUser(): Promise<LocalUser | null> {
  try {
    const data = await AsyncStorage.getItem(userKey());
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading user:", error);
    return null;
  }
}

export async function saveLocalUser(user: LocalUser): Promise<void> {
  try {
    await AsyncStorage.setItem(userKey(), JSON.stringify(user));
  } catch (error) {
    console.error("Error saving user:", error);
    throw error;
  }
}

export async function clearLocalUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(userKey());
  } catch (error) {
    console.error("Error clearing user:", error);
    throw error;
  }
}

export async function getSettings(): Promise<AppSettings | null> {
  try {
    const data = await AsyncStorage.getItem(settingsKey());
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading settings:", error);
    return null;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(settingsKey(), JSON.stringify(settings));
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
    const matching = index
      .filter((entry) => entry.episodeId === episodeId)
      .sort(
        (a, b) =>
          new Date(a.procedureDate).getTime() -
          new Date(b.procedureDate).getTime(),
      );
    if (matching.length === 0) return [];

    return getCasesByIds(matching.map((entry) => entry.id));
  } catch (error) {
    console.error("Error reading cases by episode:", error);
    return [];
  }
}

export async function getCaseSummariesByEpisodeId(
  episodeId: string,
): Promise<CaseSummary[]> {
  const summaries = await getCaseSummaries();

  return summaries
    .filter((summary) => summary.episodeId === episodeId)
    .sort(
      (a, b) =>
        new Date(a.procedureDate).getTime() -
        new Date(b.procedureDate).getTime(),
    );
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

/** Clear in-memory read caches. Call on logout / user switch. */
export function clearUserCaches(): void {
  clearCaseReadCaches();
}

export async function clearAllData(): Promise<void> {
  try {
    const index = await getCaseIndex();

    // Collect media URIs from this user's cases for targeted deletion
    const mediaUris: string[] = [];
    for (const entry of index) {
      const c = await getCase(entry.id);
      if (c?.operativeMedia) {
        mediaUris.push(...c.operativeMedia.map((m) => m.localUri));
      }
    }

    // Remove user-scoped case blobs
    for (const entry of index) {
      await AsyncStorage.removeItem(caseKey(entry.id));
    }
    await AsyncStorage.removeItem(caseIndexKey());
    await AsyncStorage.removeItem(timelineKey());
    await AsyncStorage.removeItem(userKey());
    await AsyncStorage.removeItem(settingsKey());
    await AsyncStorage.removeItem(caseSummariesKey());

    // Remove user-scoped draft keys
    const { getActiveUserId: getUid } = await import("./activeUser");
    const userId = getUid();
    const allKeys = await AsyncStorage.getAllKeys();
    const draftKeys = allKeys.filter(
      (key) =>
        key.startsWith(STORAGE_BASE_KEYS.CASE_DRAFT_PREFIX) &&
        key.endsWith(`::${userId}`),
    );
    if (draftKeys.length > 0) {
      await AsyncStorage.multiRemove(draftKeys);
    }

    // Delete only this user's media (not other users')
    if (mediaUris.length > 0) {
      await deleteMultipleEncryptedMedia(mediaUris);
    }

    clearCaseReadCaches();
  } catch (error) {
    console.error("Error clearing all data:", error);
    throw error;
  }
}
