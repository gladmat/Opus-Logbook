import AsyncStorage from "@react-native-async-storage/async-storage";
import { InteractionManager } from "react-native";
import {
  Case,
  TimelineEvent,
  CountryCode,
  ComplicationEntry,
} from "@/types/case";
import { encryptData, decryptData } from "./encryption";
import { deleteMultipleEncryptedMedia } from "./mediaStorage";
import * as Crypto from "expo-crypto";
import { migrateCase } from "./migration";

const CASE_INDEX_KEY = "@surgical_logbook_case_index";
const CASE_PREFIX = "@surgical_logbook_case_";
const TIMELINE_KEY = "@surgical_logbook_timeline";
const USER_KEY = "@surgical_logbook_user";
const SETTINGS_KEY = "@surgical_logbook_settings";
const CASE_DRAFT_KEY_PREFIX = "@surgical_logbook_case_draft_";
const LEGACY_ENCRYPTED_CASES_KEY = "@surgical_logbook_cases_encrypted";
const LEGACY_CASES_KEY = "@surgical_logbook_cases";

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
}

async function hashPatientIdentifier(
  patientIdentifier?: string,
): Promise<string | undefined> {
  if (!patientIdentifier) return undefined;
  const normalized = patientIdentifier.toUpperCase().replace(/\s/g, "");
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalized,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

let indexMigrated = false;

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
  try {
    const data = await AsyncStorage.getItem(CASE_INDEX_KEY);
    if (data) {
      const parsed = JSON.parse(data) as CaseIndexEntry[];
      if (!indexMigrated) {
        const migrated = await migrateCaseIndexIfNeeded(parsed);
        indexMigrated = true;
        return migrated;
      }
      return parsed;
    }
    return [];
  } catch (error) {
    console.error("Error reading case index:", error);
    return [];
  }
}

async function saveCaseIndex(index: CaseIndexEntry[]): Promise<void> {
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

    const index = await getCaseIndex();
    if (index.length === 0) return [];

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
    return results.filter((c): c is Case => c !== null);
  } catch (error) {
    console.error("Error reading cases:", error);
    return [];
  }
}

export async function getCase(id: string): Promise<Case | null> {
  try {
    const encrypted = await AsyncStorage.getItem(`${CASE_PREFIX}${id}`);
    if (!encrypted) return null;

    const decrypted = await decryptData(encrypted);
    return migrateCase(JSON.parse(decrypted));
  } catch (error) {
    console.error("Error reading case:", error);
    return null;
  }
}

export async function saveCase(caseData: Case): Promise<void> {
  try {
    const now = new Date().toISOString();
    const updatedCase = { ...caseData, updatedAt: now };

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
  } catch (error) {
    console.error("Error saving case:", error);
    throw error;
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
    const encrypted = await encryptData(JSON.stringify(draft));
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

export async function markNoComplications(caseId: string): Promise<void> {
  await updateCase(caseId, {
    complicationsReviewed: true,
    complicationsReviewedAt: new Date().toISOString(),
    hasComplications: false,
    complications: [],
  });
}

export async function findCasesByPatientId(patientId: string): Promise<Case[]> {
  const index = await getCaseIndex();
  const patientIdentifierHash = await hashPatientIdentifier(patientId);
  if (!patientIdentifierHash) return [];

  const matchingEntries = index.filter((e) => {
    return e.patientIdentifierHash === patientIdentifierHash;
  });

  const cases: Case[] = [];
  for (const entry of matchingEntries) {
    const caseData = await getCase(entry.id);
    if (caseData) {
      cases.push(caseData);
    }
  }

  return cases;
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
    const allEvents: TimelineEvent[] = JSON.parse(decrypted);
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
    events.unshift(event);
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
    events[index] = {
      ...events[index]!,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
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

export async function getCasesByEpisodeId(
  episodeId: string,
): Promise<Case[]> {
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
  } catch (error) {
    console.error("Error clearing all data:", error);
    throw error;
  }
}
