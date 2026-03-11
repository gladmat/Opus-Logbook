/**
 * Opus Inbox — persistent encrypted staging area for unassigned clinical photos.
 *
 * Photos enter the Inbox (via camera or gallery), sit there until assigned to a
 * case, and are automatically cleaned up if abandoned. Index stored in MMKV,
 * image data uses the existing opus-media:{uuid} AES-256-GCM pipeline.
 */

/**
 * An unassigned photo sitting in the Opus Inbox.
 *
 * Core fields are always present. Template metadata is optional —
 * set when captured via Opus Camera with a guided protocol template.
 */
export interface InboxItem {
  id: string;
  localUri: string; // opus-media:{uuid} encrypted URI
  mimeType: string;
  capturedAt: string; // ISO timestamp — when photo was originally taken
  importedAt: string; // ISO timestamp — when photo entered the Inbox
  status: InboxItemStatus;
  sourceType: "camera" | "gallery" | "smart_import" | "opus_camera";
  sourceAssetId?: string;
  width?: number;
  height?: number;

  /** Protocol ID used during guided capture (e.g. "free_flap", "aesthetic_breast"). */
  templateId?: string;
  /** Index of the protocol step this photo was captured for. */
  templateStepIndex?: number;
  /** Patient identifier (NHI/ID) entered during Opus Camera capture. */
  patientIdentifier?: string;
  /** Normalized SHA-256 hash used for safe matching logic. */
  patientIdentifierHash?: string;
  /** Reservation token for draft or in-flight case workflows. */
  reservationKey?: string;
  reservedAt?: string;
  assignedCaseId?: string;
  assignedAt?: string;
}

/**
 * Inbox state persisted in MMKV.
 */
export interface InboxState {
  items: InboxItem[];
  version: number; // Schema version for future migration
}

export type InboxItemStatus = "unassigned" | "reserved" | "assigned";
