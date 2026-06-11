import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupApp } from "../app";

let app: Express;

beforeAll(async () => {
  app = await setupApp();
});

describe("POST /api/users/discover-psi", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/users/discover-psi")
      .send({ blinded: [{ ref: "c1|email", point: "ab".repeat(32) }] });
    expect(res.status).toBe(401);
  });
});
