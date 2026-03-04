import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupApp } from "../app";

let app: Express;

beforeAll(async () => {
  app = await setupApp();
});

describe("Input validation", () => {
  describe("POST /api/auth/signup", () => {
    it("rejects empty body", async () => {
      const res = await request(app).post("/api/auth/signup").send({});
      expect(res.status).toBe(400);
    });

    it("rejects non-string email", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: 12345, password: "validpassword123" });
      expect(res.status).toBe(400);
    });

    it("rejects excessively long password", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "test@example.com", password: "a".repeat(200) });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/request-password-reset", () => {
    it("rejects invalid email", async () => {
      const res = await request(app)
        .post("/api/auth/request-password-reset")
        .send({ email: "not-an-email" });
      expect(res.status).toBe(400);
    });

    it("rejects missing email", async () => {
      const res = await request(app)
        .post("/api/auth/request-password-reset")
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("rejects empty body", async () => {
      const res = await request(app).post("/api/auth/reset-password").send({});
      expect(res.status).toBe(400);
    });

    it("rejects password under 8 chars", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({ token: "valid-token", newPassword: "short" });
      expect(res.status).toBe(400);
    });
  });
});
