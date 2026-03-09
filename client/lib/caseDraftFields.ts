import type { OperativeMediaItem } from "@/types/case";

import { normalizeDateOnlyValue } from "@/lib/dateValues";

export function serializeDraftOperativeMedia(
  operativeMedia: OperativeMediaItem[],
): OperativeMediaItem[] | undefined {
  return operativeMedia.length > 0 ? operativeMedia : undefined;
}

export function restoreDraftDateOnlyValue(
  dateValue?: string,
): string | undefined {
  return normalizeDateOnlyValue(dateValue);
}

export function restoreDraftProcedureDate(
  procedureDate?: string,
): string | undefined {
  return restoreDraftDateOnlyValue(procedureDate);
}

export function restoreDraftOperativeMedia(
  operativeMedia?: OperativeMediaItem[],
): OperativeMediaItem[] {
  return operativeMedia ?? [];
}
