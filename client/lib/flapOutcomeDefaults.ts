import { v4 as uuidv4 } from "uuid";
import type { FlapReExploration, FreeFlapOutcomeDetails } from "@/types/case";
import type { FlapMonitoringProtocolId } from "@/types/surgicalPreferences";
import { parseDateOnlyValue } from "@/lib/dateValues";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Derives days-post-op from (assessment date − procedure date). Returns
 * null when either date is missing/unparseable or the assessment precedes
 * the procedure — the caller keeps manual entry in play.
 */
export function deriveAssessedDaysPostOp(
  procedureDate: string | undefined,
  assessedDate: string | undefined,
): number | null {
  const procDate = parseDateOnlyValue(procedureDate);
  const assessed = parseDateOnlyValue(assessedDate);
  if (!procDate || !assessed) return null;

  const diffDays = Math.round(
    (assessed.getTime() - procDate.getTime()) / MS_PER_DAY,
  );
  return diffDays >= 0 ? diffDays : null;
}

function buildDefaultReExploration(): FlapReExploration {
  return {
    reExplored: true,
    events: [
      {
        id: uuidv4(),
        hoursPostOp: 0,
        finding: "venous_thrombosis",
        intervention: "thrombectomy_reanastomosis",
        salvageOutcome: "salvaged_complete",
      },
    ],
  };
}

interface FlapOutcomeDefaultOptions {
  monitoringProtocol?: FlapMonitoringProtocolId;
  returnToTheatre?: boolean;
}

export function buildDefaultFlapOutcome({
  monitoringProtocol,
  returnToTheatre,
}: FlapOutcomeDefaultOptions = {}): FreeFlapOutcomeDetails {
  return {
    flapSurvival: "complete_survival",
    ...(monitoringProtocol ? { monitoringProtocol } : {}),
    ...(returnToTheatre ? { reExploration: buildDefaultReExploration() } : {}),
  };
}

export function withDefaultFlapOutcome(
  existing: FreeFlapOutcomeDetails | undefined,
  options: FlapOutcomeDefaultOptions = {},
): FreeFlapOutcomeDetails {
  const next = { ...(existing || {}) } as FreeFlapOutcomeDetails;

  if (!next.flapSurvival) {
    next.flapSurvival = "complete_survival";
  }

  if (!next.monitoringProtocol && options.monitoringProtocol) {
    next.monitoringProtocol = options.monitoringProtocol;
  }

  if (!next.reExploration && options.returnToTheatre) {
    next.reExploration = buildDefaultReExploration();
  }

  return next;
}
