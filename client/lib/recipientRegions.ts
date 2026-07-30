import {
  type AnatomicalRegion,
  type FreeFlapDetails,
  type SnomedRefItem,
  ANATOMICAL_REGION_LABELS,
  RECIPIENT_SITE_SNOMED_MAP,
} from "@/types/case";

/**
 * Multi-region recipient site helpers.
 *
 * Invariant: `recipientSiteRegions[0]` is the primary region and always
 * mirrors the single `recipientSiteRegion` + its SNOMED pair, so every
 * single-region reader (reports, exports, gates, shared blobs, older app
 * versions) keeps working unchanged. `buildRecipientRegionPatch` is the
 * single place that enforces the mirror — all writers go through it.
 */

type RecipientRegionFields = Pick<
  FreeFlapDetails,
  "recipientSiteRegion" | "recipientSiteRegions"
>;

/** Vessel option annotated with the region whose preset/fetch produced it. */
export type RegionVesselOption = SnomedRefItem & {
  sourceRegion: AnatomicalRegion;
};

/**
 * Canonical reader: the multi-region array when present and non-empty,
 * otherwise the legacy single field wrapped in an array, otherwise [].
 */
export function getRecipientRegions(
  details: RecipientRegionFields | undefined,
): AnatomicalRegion[] {
  if (!details) return [];
  if (details.recipientSiteRegions && details.recipientSiteRegions.length > 0) {
    return details.recipientSiteRegions;
  }
  return details.recipientSiteRegion ? [details.recipientSiteRegion] : [];
}

/**
 * Order-preserving toggle. Selection order carries meaning — the first
 * selected region is the primary — so removal never reorders survivors.
 */
export function toggleRecipientRegion(
  current: AnatomicalRegion[],
  region: AnatomicalRegion,
): AnatomicalRegion[] {
  return current.includes(region)
    ? current.filter((r) => r !== region)
    : [...current, region];
}

/**
 * Patch enforcing the primary-mirror invariant: the single field + SNOMED
 * pair always derive from `next[0]`. Empty selection clears everything.
 */
export function buildRecipientRegionPatch(
  next: AnatomicalRegion[],
): Pick<
  FreeFlapDetails,
  | "recipientSiteRegion"
  | "recipientSiteRegions"
  | "recipientSiteSnomedCode"
  | "recipientSiteSnomedDisplay"
> {
  const primary = next[0];
  if (!primary) {
    return {
      recipientSiteRegion: undefined,
      recipientSiteRegions: undefined,
      recipientSiteSnomedCode: undefined,
      recipientSiteSnomedDisplay: undefined,
    };
  }
  const snomed = RECIPIENT_SITE_SNOMED_MAP[primary];
  return {
    recipientSiteRegion: primary,
    recipientSiteRegions: next,
    recipientSiteSnomedCode: snomed?.code,
    recipientSiteSnomedDisplay: snomed?.display,
  };
}

/**
 * Display string for all selected regions, primary first.
 * Joined with " + " (no commas — keeps CSV report cells quote-free).
 */
export function formatRecipientRegions(
  details: RecipientRegionFields | undefined,
): string {
  return getRecipientRegions(details)
    .map((region) => ANATOMICAL_REGION_LABELS[region])
    .join(" + ");
}

/**
 * Union of per-region vessel lists, deduped by SNOMED code with the
 * earlier region winning (so the primary's tagging is kept when a vessel
 * appears in multiple presets, e.g. radial artery in hand + forearm).
 */
export function unionVesselOptions(
  perRegion: { region: AnatomicalRegion; items: SnomedRefItem[] }[],
): RegionVesselOption[] {
  const seen = new Set<string>();
  const result: RegionVesselOption[] = [];
  for (const { region, items } of perRegion) {
    for (const item of items) {
      if (seen.has(item.snomedCtCode)) continue;
      seen.add(item.snomedCtCode);
      result.push({ ...item, sourceRegion: region });
    }
  }
  return result;
}
