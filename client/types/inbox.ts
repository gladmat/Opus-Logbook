/**
 * Opus Inbox — persistent encrypted staging area for unassigned clinical photos.
 *
 * Photos enter the Inbox (via camera or gallery), sit there until assigned to a
 * case, and are automatically cleaned up if abandoned. Index stored in MMKV,
 * image data uses the existing opus-media:{uuid} AES-256-GCM pipeline.
 */

/**
 * An unassigned photo sitting in the Opus Inbox.
 * Deliberately lean — no tags, no captions, no patient IDs.
 */
export interface InboxItem {
  id: string;
  localUri: string; // opus-media:{uuid} encrypted URI
  mimeType: string;
  capturedAt: string; // ISO timestamp — when photo was taken/imported
  sourceType: "camera" | "gallery";
}

/**
 * Inbox state persisted in MMKV.
 */
export interface InboxState {
  items: InboxItem[];
  version: number; // Schema version for future migration
}
