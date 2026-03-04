import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupApp } from "../app";

let app: Express;

beforeAll(async () => {
  app = await setupApp();
});

describe("Auth endpoints", () => {
  describe("POST /api/auth/signup", () => {
    it("returns 400 with missing email", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ password: "testpassword123" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 with missing password", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "test@example.com" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 with invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "not-an-email", password: "testpassword123" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 with password too short", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "test@example.com", password: "short" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns 400 with missing fields", async () => {
      const res = await request(app).post("/api/auth/login").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 with invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "not-an-email", password: "testpassword123" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe("POST /api/auth/change-password", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/auth/change-password")
        .send({ currentPassword: "old", newPassword: "newpassword123" });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("returns 400 with missing token", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({ newPassword: "newpassword123" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 with short password", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({ token: "sometoken", newPassword: "short" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});

describe("Protected endpoints require auth", () => {
  it("GET /api/profile returns 401 without token", async () => {
    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(401);
  });

  it("GET /api/facilities returns 401 without token", async () => {
    const res = await request(app).get("/api/facilities");
    expect(res.status).toBe(401);
  });

  it("POST /api/facilities returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/facilities")
      .send({ facilityName: "Test Hospital" });
    expect(res.status).toBe(401);
  });

  it("GET /api/snomed-ref returns 401 without token", async () => {
    const res = await request(app).get("/api/snomed-ref");
    expect(res.status).toBe(401);
  });

  it("POST /api/flaps returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/flaps")
      .send({ procedureId: "fake-id", flapDisplayName: "Test" });
    expect(res.status).toBe(401);
  });

  it("POST /api/anastomoses returns 401 without token", async () => {
    const res = await request(app).post("/api/anastomoses").send({
      flapId: "fake-id",
      vesselType: "artery",
      recipientVesselName: "test",
    });
    expect(res.status).toBe(401);
  });

  it("rejects requests with invalid token", async () => {
    const res = await request(app)
      .get("/api/profile")
      .set("Authorization", "Bearer invalid.token.here");
    expect(res.status).toBe(403);
  });
});

describe("Health check", () => {
  it("GET /api/health returns 200", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
