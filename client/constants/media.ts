/**
 * Shared media limits.
 *
 * MAX_CASE_MEDIA_ITEMS is the maximum number of photos per case
 * operative-media set / timeline event — a TOTAL cap, not a per-batch one
 * (pickers compute their remaining selectionLimit from it). Raised from 15
 * to 50 (2.20.0, on-device feedback); Smart Import already allowed 50 and
 * the thumbnail decrypt cache (80 entries) + FlashList handle this
 * comfortably.
 */
export const MAX_CASE_MEDIA_ITEMS = 50;
