import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import { setupApp } from "../app";
import {
  BodyTooLargeError,
  SHARED_MEDIA_ID_RE,
  SHARED_MEDIA_MAX_BYTES,
  isSharedMediaVariant,
  removeCaseMediaDir,
  removeMediaFiles,
  removeOwnerMediaDir,
  resolveSharedMediaAccess,
  sharedMediaCaseDir,
  sharedMediaPath,
  streamBodyToFile,
} from "../sharedMedia";
import { envSchema } from "../env";

let app: Express;
let root: string;

beforeAll(async () => {
  app = await setupApp();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "opus-shared-media-"));
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

// ── Auth boundaries (supertest pattern — no DB behind the token gate) ───────

describe("shared media endpoints require auth", () => {
  it("PUT /api/share-media/:caseId/:mediaId/:variant → 401", async () => {
    const res = await request(app)
      .put("/api/share-media/case-1/media-1/thumb")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("abc"));
    expect(res.status).toBe(401);
  });

  it("GET /api/share-media/:caseId → 401", async () => {
    const res = await request(app).get("/api/share-media/case-1");
    expect(res.status).toBe(401);
  });

  it("DELETE /api/share-media/:caseId/:mediaId → 401", async () => {
    const res = await request(app).delete("/api/share-media/case-1/media-1");
    expect(res.status).toBe(401);
  });

  it("GET /api/shared/:sharedCaseId/media/:mediaId/:variant → 401", async () => {
    const res = await request(app).get(
      "/api/shared/share-1/media/media-1/image",
    );
    expect(res.status).toBe(401);
  });
});

// ── Path safety ──────────────────────────────────────────────────────────────

describe("sharedMediaPath", () => {
  it("builds the canonical {owner}/{case}/{media}.{variant}.enc path", () => {
    const p = sharedMediaPath(root, "owner-1", "case-1", "media-1", "thumb");
    expect(p).toBe(path.join(root, "owner-1", "case-1", "media-1.thumb.enc"));
    expect(sharedMediaCaseDir(root, "owner-1", "case-1")).toBe(
      path.join(root, "owner-1", "case-1"),
    );
  });

  it("rejects traversal, separators, empty and over-long ids", () => {
    for (const bad of [
      "..",
      "../x",
      "a/b",
      "a\\b",
      "",
      "x".repeat(65),
      "a b",
    ]) {
      expect(sharedMediaPath(root, "owner", bad, "m", "image")).toBeNull();
      expect(sharedMediaPath(root, "owner", "c", bad, "image")).toBeNull();
      expect(sharedMediaPath(root, bad, "c", "m", "image")).toBeNull();
    }
  });

  it("rejects unknown variants", () => {
    expect(
      sharedMediaPath(root, "o", "c", "m", "full" as unknown as "image"),
    ).toBeNull();
    expect(isSharedMediaVariant("thumb")).toBe(true);
    expect(isSharedMediaVariant("image")).toBe(true);
    expect(isSharedMediaVariant("full")).toBe(false);
  });

  it("accepts uuid-shaped ids", () => {
    const uuid = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
    expect(SHARED_MEDIA_ID_RE.test(uuid)).toBe(true);
    expect(sharedMediaPath(root, uuid, uuid, uuid, "image")).not.toBeNull();
  });
});

// ── Access matrix ────────────────────────────────────────────────────────────

describe("resolveSharedMediaAccess", () => {
  const row = { ownerUserId: "owner", recipientUserId: "recipient" };
  it("owner → owner, recipient → recipient, anyone else → null", () => {
    expect(resolveSharedMediaAccess(row, "owner")).toBe("owner");
    expect(resolveSharedMediaAccess(row, "recipient")).toBe("recipient");
    expect(resolveSharedMediaAccess(row, "stranger")).toBeNull();
    expect(resolveSharedMediaAccess(row, "")).toBeNull();
  });
});

// ── Streaming to disk with a cap ─────────────────────────────────────────────

describe("streamBodyToFile", () => {
  it("writes the body atomically and returns the byte count", async () => {
    const dest = path.join(root, "stream", "ok.enc");
    const bytes = await streamBodyToFile(
      Readable.from([Buffer.from("hello "), Buffer.from("world")]),
      dest,
      1024,
    );
    expect(bytes).toBe(11);
    expect(fs.readFileSync(dest, "utf8")).toBe("hello world");
    // No .part temp file left behind.
    expect(fs.readdirSync(path.dirname(dest))).toEqual(["ok.enc"]);
  });

  it("rejects with BodyTooLargeError past the cap and leaves no file", async () => {
    const dest = path.join(root, "stream", "big.enc");
    await expect(
      streamBodyToFile(
        Readable.from([Buffer.alloc(600), Buffer.alloc(600)]),
        dest,
        1000,
      ),
    ).rejects.toBeInstanceOf(BodyTooLargeError);
    expect(fs.existsSync(dest)).toBe(false);
    expect(
      fs.readdirSync(path.dirname(dest)).filter((f) => f.startsWith("big")),
    ).toEqual([]);
  });

  it("variant caps: thumb 512 KB, image 12 MB", () => {
    expect(SHARED_MEDIA_MAX_BYTES.thumb).toBe(512 * 1024);
    expect(SHARED_MEDIA_MAX_BYTES.image).toBe(12 * 1024 * 1024);
  });
});

// ── Cleanup ──────────────────────────────────────────────────────────────────

describe("cleanup helpers", () => {
  it("removeMediaFiles / removeCaseMediaDir / removeOwnerMediaDir", async () => {
    const owner = "owner-x";
    const write = (
      caseId: string,
      mediaId: string,
      variant: "thumb" | "image",
    ) => {
      const p = sharedMediaPath(root, owner, caseId, mediaId, variant)!;
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, "x");
      return p;
    };
    const a1 = write("case-a", "m1", "thumb");
    const a2 = write("case-a", "m1", "image");
    const a3 = write("case-a", "m2", "image");
    const b1 = write("case-b", "m9", "thumb");

    await removeMediaFiles(root, owner, "case-a", "m1");
    expect(fs.existsSync(a1)).toBe(false);
    expect(fs.existsSync(a2)).toBe(false);
    expect(fs.existsSync(a3)).toBe(true);

    await removeCaseMediaDir(root, owner, "case-a");
    expect(fs.existsSync(path.dirname(a3))).toBe(false);
    expect(fs.existsSync(b1)).toBe(true);

    await removeOwnerMediaDir(root, owner);
    expect(fs.existsSync(path.join(root, owner))).toBe(false);
  });

  it("cleanup with an unsafe id is a no-op, never an escape", async () => {
    await expect(removeOwnerMediaDir(root, "..")).resolves.toBeUndefined();
    expect(fs.existsSync(root)).toBe(true);
  });
});

// ── env ──────────────────────────────────────────────────────────────────────

describe("envSchema UPLOADS_DIR", () => {
  const BASE = {
    DATABASE_URL: "postgresql://x/y",
    JWT_SECRET: "a".repeat(48),
    PORT: "5000",
  };
  it("is optional", () => {
    const r = envSchema.safeParse(BASE);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.UPLOADS_DIR).toBeUndefined();
  });
  it("accepts an absolute volume mount", () => {
    const r = envSchema.safeParse({ ...BASE, UPLOADS_DIR: "/data/uploads" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.UPLOADS_DIR).toBe("/data/uploads");
  });
  it("rejects an empty string", () => {
    expect(envSchema.safeParse({ ...BASE, UPLOADS_DIR: "" }).success).toBe(
      false,
    );
  });
});
