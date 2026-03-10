import { useMemo } from "react";
import type { Case, Specialty } from "@/types/case";
import { getCaseSpecialties } from "@/types/case";
import type { EpisodeWithCases } from "@/hooks/useActiveEpisodes";
import { PENDING_ACTION_LABELS } from "@/types/episode";
import { getCasePrimaryTitle } from "@/lib/caseDiagnosisSummary";
import { INFECTION_SYNDROME_LABELS } from "@/types/infection";
import { caseCanAddHistology } from "@/lib/skinCancerConfig";

export interface AttentionItem {
  id: string;
  type: "inpatient" | "episode" | "infection" | "inbox_photos";
  patientIdentifier: string;
  diagnosisTitle: string;
  specialty: Specialty;
  facility?: string;
  caseId?: string;
  postOpDay?: number;
  hasEpisodeLink?: boolean;
  episodeId?: string;
  episodeStatus?: "active" | "on_hold" | "planned";
  daysSinceLastEncounter?: number;
  pendingAction?: string;
  caseCount?: number;
  lastProcedureSummary?: string;
  lastCaseDate?: string;
  lastCaseId?: string;
  infectionSyndrome?: string;
  canAddHistology?: boolean;
  inboxCount?: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function useAttentionItems(
  cases: Case[],
  episodesWithCases: EpisodeWithCases[],
  selectedSpecialty: string | null,
): AttentionItem[] {
  return useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // --- Inpatients ---
    const inpatientItems: AttentionItem[] = [];
    const inpatientCaseIds = new Set<string>();

    for (const c of cases) {
      if (c.dischargeDate) continue;

      if (selectedSpecialty) {
        const specialties = getCaseSpecialties(c);
        if (!specialties.includes(selectedSpecialty as never)) continue;
      }

      const opDate = new Date(c.procedureDate);
      opDate.setHours(0, 0, 0, 0);
      const postOpDay = Math.max(
        0,
        Math.round((today.getTime() - opDate.getTime()) / DAY_MS),
      );

      inpatientCaseIds.add(c.id);
      inpatientItems.push({
        id: `inpatient-${c.id}`,
        type: "inpatient",
        patientIdentifier: c.patientIdentifier,
        diagnosisTitle: getCasePrimaryTitle(c) || c.procedureType || "Unknown",
        specialty: c.diagnosisGroups[0]?.specialty ?? c.specialty,
        facility: c.facility,
        caseId: c.id,
        postOpDay,
        hasEpisodeLink: !!c.episodeId,
        canAddHistology: caseCanAddHistology(c),
      });
    }

    // Sort inpatients: longest stay first
    inpatientItems.sort((a, b) => (b.postOpDay ?? 0) - (a.postOpDay ?? 0));

    // --- Active Infections (non-inpatient cases) ---
    // Includes both full InfectionOverlay cases and non-escalated hand infections
    // with spreading/systemic severity.
    const infectionItems: AttentionItem[] = [];
    const infectionCaseIds = new Set<string>();

    for (const c of cases) {
      if (c.infectionOverlay?.status !== "active") {
        // Check for non-escalated hand infections with concerning severity
        const hasSevereHandInfection = c.diagnosisGroups?.some(
          (g) =>
            g.handInfectionDetails &&
            !g.handInfectionDetails.escalatedToFullModule &&
            (g.handInfectionDetails.severity === "spreading" ||
              g.handInfectionDetails.severity === "systemic"),
        );
        if (!hasSevereHandInfection) continue;
      }
      if (inpatientCaseIds.has(c.id)) continue; // already shown as inpatient
      if (infectionCaseIds.has(c.id)) continue;
      infectionCaseIds.add(c.id);

      if (selectedSpecialty) {
        const specialties = getCaseSpecialties(c);
        if (!specialties.includes(selectedSpecialty as never)) continue;
      }

      const syndromePrimary = c.infectionOverlay?.syndromePrimary;
      const syndromeLabel = syndromePrimary
        ? (INFECTION_SYNDROME_LABELS[syndromePrimary] ?? syndromePrimary)
        : "Hand infection";
      infectionItems.push({
        id: `infection-${c.id}`,
        type: "infection",
        patientIdentifier: c.patientIdentifier,
        diagnosisTitle: getCasePrimaryTitle(c) || c.procedureType || "Unknown",
        specialty: c.diagnosisGroups[0]?.specialty ?? c.specialty,
        facility: c.facility,
        caseId: c.id,
        hasEpisodeLink: !!c.episodeId,
        infectionSyndrome: syndromeLabel,
        canAddHistology: caseCanAddHistology(c),
      });
    }

    // --- Episodes ---
    const activeStatuses = new Set(["active", "on_hold", "planned"]);
    const episodeItems: AttentionItem[] = [];

    for (const { episode, cases: linkedCases } of episodesWithCases) {
      if (!activeStatuses.has(episode.status)) continue;

      if (selectedSpecialty && episode.specialty !== selectedSpecialty)
        continue;

      // Find most recent linked case
      let daysSinceLastEncounter: number | undefined;
      let lastProcedureSummary: string | undefined;
      let lastCaseDate: string | undefined;
      let lastCaseId: string | undefined;
      let lastCaseCanAddHistology = false;
      let facility: string | undefined;

      if (linkedCases.length > 0) {
        const sorted = [...linkedCases].sort(
          (a, b) =>
            new Date(b.procedureDate).getTime() -
            new Date(a.procedureDate).getTime(),
        );
        const mostRecent = sorted[0];
        if (mostRecent) {
          const caseDate = new Date(mostRecent.procedureDate);
          caseDate.setHours(0, 0, 0, 0);
          daysSinceLastEncounter = Math.max(
            0,
            Math.round((today.getTime() - caseDate.getTime()) / DAY_MS),
          );
          lastProcedureSummary =
            getCasePrimaryTitle(mostRecent) || mostRecent.procedureType;
          lastCaseDate = mostRecent.procedureDate;
          lastCaseId = mostRecent.id;
          lastCaseCanAddHistology = caseCanAddHistology(mostRecent);
          facility = mostRecent.facility;
        }
      }

      episodeItems.push({
        id: `episode-${episode.id}`,
        type: "episode",
        patientIdentifier: episode.patientIdentifier,
        diagnosisTitle: episode.title || episode.primaryDiagnosisDisplay,
        specialty: episode.specialty,
        facility,
        episodeId: episode.id,
        episodeStatus: episode.status as "active" | "on_hold" | "planned",
        daysSinceLastEncounter,
        pendingAction: episode.pendingAction
          ? PENDING_ACTION_LABELS[episode.pendingAction]
          : undefined,
        caseCount: linkedCases.length,
        lastProcedureSummary,
        lastCaseDate,
        lastCaseId,
        canAddHistology: lastCaseCanAddHistology,
      });
    }

    // Sort episodes: longest gap first
    episodeItems.sort(
      (a, b) =>
        (b.daysSinceLastEncounter ?? 0) - (a.daysSinceLastEncounter ?? 0),
    );

    // Inpatients first, then infections, then episodes
    return [...inpatientItems, ...infectionItems, ...episodeItems];
  }, [cases, episodesWithCases, selectedSpecialty]);
}
