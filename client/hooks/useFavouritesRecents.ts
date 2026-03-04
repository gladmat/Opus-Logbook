import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Specialty } from "@/types/case";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";

// ─── Storage Keys ───────────────────────────────────────────────────────────

const FAVOURITES_KEY = "@surgical_logbook_favourites";
const RECENTS_KEY = "@surgical_logbook_recents";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RecentEntry {
  id: string;
  count: number;
  lastUsed: string; // ISO date string
}

interface FavouritesData {
  diagnoses: Partial<Record<Specialty, string[]>>;
  procedures: Partial<Record<Specialty, string[]>>;
}

interface RecentsData {
  diagnoses: Partial<Record<Specialty, RecentEntry[]>>;
  procedures: Partial<Record<Specialty, RecentEntry[]>>;
}

const MAX_FAVOURITES = 10;
const MAX_RECENTS = 10;
const RECENTS_EXPIRY_DAYS = 30;

// ─── Storage Helpers ────────────────────────────────────────────────────────

async function loadFavourites(): Promise<FavouritesData> {
  try {
    const raw = await AsyncStorage.getItem(FAVOURITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error loading favourites:", e);
  }
  return { diagnoses: {}, procedures: {} };
}

async function saveFavourites(data: FavouritesData): Promise<void> {
  try {
    await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving favourites:", e);
  }
}

async function loadRecents(): Promise<RecentsData> {
  try {
    const raw = await AsyncStorage.getItem(RECENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error loading recents:", e);
  }
  return { diagnoses: {}, procedures: {} };
}

async function saveRecents(data: RecentsData): Promise<void> {
  try {
    await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving recents:", e);
  }
}

function pruneRecents(entries: RecentEntry[]): RecentEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENTS_EXPIRY_DAYS);
  const cutoffStr = cutoff.toISOString();

  return entries
    .filter((e) => e.lastUsed >= cutoffStr)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_RECENTS);
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useFavouritesRecents(specialty: Specialty) {
  const [favouritesData, setFavouritesData] = useState<FavouritesData>({
    diagnoses: {},
    procedures: {},
  });
  const [recentsData, setRecentsData] = useState<RecentsData>({
    diagnoses: {},
    procedures: {},
  });
  const [loaded, setLoaded] = useState(false);

  // Refs to avoid stale closure in recordUsage
  const favouritesRef = useRef(favouritesData);
  favouritesRef.current = favouritesData;
  const recentsRef = useRef(recentsData);
  recentsRef.current = recentsData;

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [favs, recs] = await Promise.all([loadFavourites(), loadRecents()]);
      if (cancelled) return;
      setFavouritesData(favs);
      setRecentsData(recs);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Favourites ──────────────────────────────────────────────────────────

  const favouriteDiagnosisIds = useMemo(
    () => new Set(favouritesData.diagnoses[specialty] ?? []),
    [favouritesData, specialty],
  );

  const favouriteProcedureIds = useMemo(
    () => new Set(favouritesData.procedures[specialty] ?? []),
    [favouritesData, specialty],
  );

  const favouriteDiagnoses: DiagnosisPicklistEntry[] = useMemo(() => {
    const ids = favouritesData.diagnoses[specialty] ?? [];
    return ids
      .map((id) => findDiagnosisById(id))
      .filter((dx): dx is DiagnosisPicklistEntry => dx !== undefined);
  }, [favouritesData, specialty]);

  const isFavourite = useCallback(
    (type: "diagnosis" | "procedure", id: string): boolean => {
      if (type === "diagnosis") return favouriteDiagnosisIds.has(id);
      return favouriteProcedureIds.has(id);
    },
    [favouriteDiagnosisIds, favouriteProcedureIds],
  );

  const toggleFavourite = useCallback(
    (type: "diagnosis" | "procedure", id: string) => {
      setFavouritesData((prev) => {
        const key = type === "diagnosis" ? "diagnoses" : "procedures";
        const current = prev[key][specialty] ?? [];
        let updated: string[];

        if (current.includes(id)) {
          updated = current.filter((x) => x !== id);
        } else {
          if (current.length >= MAX_FAVOURITES) return prev; // at limit
          updated = [...current, id];
        }

        const next: FavouritesData = {
          ...prev,
          [key]: { ...prev[key], [specialty]: updated },
        };
        saveFavourites(next);
        return next;
      });
    },
    [specialty],
  );

  // ── Recents ─────────────────────────────────────────────────────────────

  const recentDiagnoses: DiagnosisPicklistEntry[] = useMemo(() => {
    const entries = pruneRecents(recentsData.diagnoses[specialty] ?? []);
    return entries
      .map((e) => findDiagnosisById(e.id))
      .filter((dx): dx is DiagnosisPicklistEntry => dx !== undefined);
  }, [recentsData, specialty]);

  const recentProcedureIds: string[] = useMemo(() => {
    return pruneRecents(recentsData.procedures[specialty] ?? []).map(
      (e) => e.id,
    );
  }, [recentsData, specialty]);

  const recordUsage = useCallback(
    (type: "diagnosis" | "procedure", id: string) => {
      setRecentsData((prev) => {
        const key = type === "diagnosis" ? "diagnoses" : "procedures";
        const current = prev[key][specialty] ?? [];
        const now = new Date().toISOString();

        const existing = current.find((e) => e.id === id);
        let updated: RecentEntry[];
        if (existing) {
          updated = current.map((e) =>
            e.id === id ? { ...e, count: e.count + 1, lastUsed: now } : e,
          );
        } else {
          updated = [...current, { id, count: 1, lastUsed: now }];
        }

        updated = pruneRecents(updated);

        const next: RecentsData = {
          ...prev,
          [key]: { ...prev[key], [specialty]: updated },
        };
        saveRecents(next);
        return next;
      });
    },
    [specialty],
  );

  return {
    loaded,
    // Favourites
    favouriteDiagnoses,
    favouriteProcedureIds,
    isFavourite,
    toggleFavourite,
    // Recents
    recentDiagnoses,
    recentProcedureIds,
    recordUsage,
  };
}
