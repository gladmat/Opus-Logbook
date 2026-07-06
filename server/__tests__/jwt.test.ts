import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { env } from "../env";
import { signAppJwt, verifyAppJwt } from "../jwt";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

describe("verifyAppJwt", () => {
  it("accepts a token minted by signAppJwt", async () => {
    const token = await signAppJwt({ userId: "user-1", tokenVersion: 3 });
    const result = await verifyAppJwt(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.userId).toBe("user-1");
      expect(result.payload.tokenVersion).toBe(3);
    }
  });

  it("rejects a token without an exp claim", async () => {
    // jose only enforces `exp` when present — a hand-crafted token signed
    // with the right secret but no expiry must not grant a forever session.
    const token = await new SignJWT({ userId: "user-1", tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .sign(SECRET);
    const result = await verifyAppJwt(token);
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an expired token with reason 'expired'", async () => {
    const token = await new SignJWT({ userId: "user-1", tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(SECRET);
    const result = await verifyAppJwt(token);
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await new SignJWT({ userId: "user-1", tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("x".repeat(48)));
    const result = await verifyAppJwt(token);
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });
});
