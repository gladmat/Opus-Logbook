/**
 * Pure descriptor ⇄ UI-state helpers for the hand-trauma laceration pathway.
 *
 * Unlike coverage descriptors (which are the product of active coverage types
 * × defect locations), each laceration site maps 1:1 to one persisted
 * SoftTissueDescriptor of type "laceration".
 */

import type {
  CoverageZone,
  DigitId,
  IntactStructureId,
  SoftTissueDescriptor,
} from "@/types/case";

export interface LacerationSite {
  digits: DigitId[];
  zone?: CoverageZone;
  surfaces: ("palmar" | "dorsal")[];
  intactStructures: IntactStructureId[];
  muscleInvolved: boolean;
}

export function deriveLacerationSites(
  descriptors: SoftTissueDescriptor[],
): LacerationSite[] {
  return descriptors
    .filter((descriptor) => descriptor.type === "laceration")
    .map((descriptor) => ({
      digits: descriptor.digits ?? [],
      zone: descriptor.zone,
      surfaces: (descriptor.surfaces ?? []) as ("palmar" | "dorsal")[],
      intactStructures: descriptor.intactStructures ?? [],
      muscleInvolved: descriptor.muscleInvolved ?? false,
    }));
}

export function lacerationSitesToDescriptors(
  sites: LacerationSite[],
  defaultDigits: DigitId[] | undefined,
): SoftTissueDescriptor[] {
  const effectiveSites: LacerationSite[] =
    sites.length > 0
      ? sites
      : [
          {
            digits: defaultDigits ?? [],
            surfaces: [],
            intactStructures: [],
            muscleInvolved: false,
          },
        ];

  return effectiveSites.map((site) => ({
    type: "laceration" as const,
    digits: site.digits.length > 0 ? site.digits : defaultDigits,
    surfaces: site.surfaces.length > 0 ? site.surfaces : undefined,
    zone: site.zone,
    // Sorted so buildSelectionSignature stays stable across re-selection order.
    intactStructures:
      site.intactStructures.length > 0
        ? [...site.intactStructures].sort()
        : undefined,
    muscleInvolved: site.muscleInvolved || undefined,
  }));
}
