import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { env } from "./env";

// Jose requires the secret as a byte buffer. JWT_SECRET is validated by
// env.ts at startup to be at least 32 characters and to not contain any
// dev/example markers in production.
const SECRET = new TextEncoder().encode(env.JWT_SECRET);

const APP_ALG = "HS256";
const APP_EXPIRY = "7d";

export interface AppJwtPayload {
  userId: string;
  tokenVersion: number;
}

/**
 * Sign an application JWT for a logged-in user. Used by login, signup,
 * Apple sign-in, password reset, and refresh endpoints.
 */
export async function signAppJwt(payload: AppJwtPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    tokenVersion: payload.tokenVersion,
  })
    .setProtectedHeader({ alg: APP_ALG })
    .setExpirationTime(APP_EXPIRY)
    .sign(SECRET);
}

export interface AppJwtVerifyResult {
  ok: true;
  payload: AppJwtPayload;
}

export interface AppJwtVerifyFailure {
  ok: false;
  reason: "invalid" | "expired";
}

/**
 * Verify an application JWT. Returns a discriminated union so callers can
 * branch on `expired` vs `invalid` for telemetry without losing the typed
 * payload on success.
 */
export async function verifyAppJwt(
  token: string,
): Promise<AppJwtVerifyResult | AppJwtVerifyFailure> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: [APP_ALG],
    });
    const userId = payload.userId;
    const tokenVersion = payload.tokenVersion;
    if (typeof userId !== "string") {
      return { ok: false, reason: "invalid" };
    }
    return {
      ok: true,
      payload: {
        userId,
        tokenVersion: typeof tokenVersion === "number" ? tokenVersion : 0,
      },
    };
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "invalid" };
  }
}
