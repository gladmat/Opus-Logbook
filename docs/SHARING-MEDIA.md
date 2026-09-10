# Shared-case photos — E2EE media transport (2.25.0)

How operative photos travel from a case owner to the colleagues they tagged, without the server (or anyone holding it) being able to open them.

## Trust boundary

- **Server holds ciphertext only.** `{UPLOADS_DIR}/shared-media/{ownerUserId}/{caseId}/{mediaId}.{thumb|image}.enc` are the owner's existing AES-256-GCM files from their on-device `opus-media` store, uploaded verbatim. `shared_case_media` records existence, byte size and the GCM auth tag — never a key.
- **Keys live inside the share blob.** `SharedCaseData.media[]` carries one `SharedMediaDescriptor` per photo: the per-image DEK (hex), nonce/tag/size per variant, dimensions, mime type, tag/caption/timestamp, and the owner's day-rounded `createdAt`. The blob is encrypted under the per-case key, which is wrapped to each recipient device (X25519 + HKDF + XChaCha20-Poly1305) — the same envelope that already protects the patient's name.
- **Why the DEK is not wrapped under the case key.** `prepareShareMaterial` mints a fresh case key on every save and the owner never keeps it. Ciphertext on the server is immutable for a given `mediaId` (the DEK never changes — `saveMediaV2` runs once per id), so edit-saves only re-send descriptors; nothing on disk is re-keyed.
- **Recipient re-wraps.** `importEncryptedMediaV2` moves the downloaded `.enc` into `opus-media/{mediaId}/` and writes a `meta.json` whose `wrappedDEK` is the shared DEK wrapped under the *recipient's* master key. From there the photo is an ordinary `opus-media:` URI for `EncryptedImage`, `useDecryptedImage` and `MediaGalleryViewer`. The plaintext meta keeps only the day-rounded `createdAt` (same forensic-correlation mitigation as owned media).

## Lifecycle

| Step | Owner | Recipient |
|---|---|---|
| Save with tagged team | `collectShareMedia` → descriptors into blob → POST/PUT share → `uploadCaseMediaForShare` reconciles against `GET /api/share-media/:caseId` (server truth) ∪ local uploaded-set, PUTs missing `(mediaId, variant)` from `getMediaPaths()` via `expo-file-system/legacy uploadAsync` (BINARY_CONTENT), DELETEs photos no longer on the case | — |
| Dashboard focus / pull-to-refresh | — | `syncSharedCases`: page the inbox, `hydrateSharedCase` for missing/stale `blobVersion`, `importSharedThumbs` (concurrency 2) via `File.downloadFileAsync` from `GET /api/shared/:sharedCaseId/media/:mediaId/thumb` |
| Open a photo | — | `ensureSharedMediaVariant(…, "image")` for the tapped photo, then the rest in the background; until the full variant lands `selectVariantSource` serves the thumbnail for the `full` variant |
| Revoke last share / delete account | Server removes the case dir / owner dir + ledger rows | `syncSharedCases` drops the cache and `deleteMultipleMediaV2` for its descriptors |

Failure modes are non-blocking: a descriptor build or upload failure never blocks the clinical share (`TeamShareOutcome.mediaErrors` / `mediaSkipped` surface in the save-time alert; the next save retries). Pre-encryption `file://` photos cannot be shared and are counted as skipped.

## Transport notes

- Bytes never go through `fetch`: React Native base64-encodes binary bodies and responses across the bridge. Uploads use the legacy `uploadAsync`, downloads `File.downloadFileAsync`; both refresh the JWT once on 401/403 (`sharedMediaApi.ts`).
- Server PUT streams `req` straight to a temp file and renames on success (`streamBodyToFile`) — no body-parser buffering; 413 past 512 KB (thumb) / 12 MB (image). The `/api/share` + `/api/shared` JSON tier is 1 MB because descriptor-bearing blobs double through the hex `case:v1:` envelope.
- Download is keyed by the share row (`sharedCaseId`), not `(owner, caseId)`: client case ids are only unique per owner, and the row is what grants access (`resolveSharedMediaAccess`: owner or named recipient).

## Ops

`UPLOADS_DIR` must point at a persistent volume in production — the Railway container filesystem is wiped on every redeploy (avatars were already being lost this way before 2.25.0):

```
railway volume add --service api-server --mount-path /data
railway variables --set UPLOADS_DIR=/data/uploads --service api-server
psql "$DATABASE_PUBLIC_URL" -f migrations/20260910_shared_case_media.sql
railway up --service api-server --detach
```
