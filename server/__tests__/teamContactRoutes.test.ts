/**
 * Auth-gate smoke for the colleague-lookup + linking routes (the handler
 * logic itself is unit-tested via server/linkResolution.ts). Pattern from
 * psiDiscovery.test.ts — no DB needed to prove the 401 gate is mounted.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupApp } from "../app";

let app: Express;

beforeAll(async () => {
  app = await setupApp();
});

describe("team-contact linking routes require auth", () => {
  it("PUT /api/team-contacts/:id/link", async () => {
    const res = await request(app)
      .put("/api/team-contacts/c1/link")
      .send({ linkedUserId: "u1" });
    expect(res.status).toBe(401);
  });

  it("PUT /api/team-contacts/:id/unlink", async () => {
    const res = await request(app).put("/api/team-contacts/c1/unlink");
    expect(res.status).toBe(401);
  });

  it("GET /api/users/search", async () => {
    const res = await request(app).get("/api/users/search?email=a@x.com");
    expect(res.status).toBe(401);
  });

  it("POST /api/users/discover", async () => {
    const res = await request(app)
      .post("/api/users/discover")
      .send({ contacts: [{ contactId: "c1", email: "a@x.com" }] });
    expect(res.status).toBe(401);
  });

  it("GET /api/users/:id/keys", async () => {
    const res = await request(app).get("/api/users/u1/keys");
    expect(res.status).toBe(401);
  });

  it("POST /api/invitations", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .send({ contactId: "c1", email: "a@x.com" });
    expect(res.status).toBe(401);
  });
});
