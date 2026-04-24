import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupApp } from "../app";

let app: Express;

beforeAll(async () => {
  app = await setupApp();
});

describe("Assessment endpoints", () => {
  describe("POST /api/assessments", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/assessments")
        .send({
          sharedCaseId: "abc",
          assessorRole: "supervisor",
          encryptedAssessment: "enc:v1:a:b",
          keyEnvelopes: [
            {
              recipientUserId: "u",
              recipientDeviceId: "d",
              envelopeJson: "{}",
            },
          ],
        });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/assessments/:sharedCaseId", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/api/assessments/some-case-id");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/assessments/history", () => {
    it("returns 401 (not 404) without auth token — proves /history is not shadowed by /:sharedCaseId", async () => {
      // Before the route-order fix, Express would match /history against
      // /:sharedCaseId and run the shared-case lookup handler, which
      // returns 404 because "history" is not a valid UUID. The fix moves
      // the /history registration BEFORE /:sharedCaseId, so the history
      // handler runs and enforces authenticateToken → 401.
      const res = await request(app).get("/api/assessments/history");
      expect(res.status).toBe(401);
    });
  });
});
