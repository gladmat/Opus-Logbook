import type { Express, Request, Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import multer from "multer";
import { storage } from "./storage";
import { allSeedData } from "./seedData";
import {
  searchProcedures,
  searchDiagnoses,
  getConceptDetails,
} from "./snomedApi";
import {
  getStagingForDiagnosis,
  getAllStagingConfigs,
} from "./diagnosisStagingConfig";
import { sendPasswordResetEmail } from "./email";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  insertProfileSchema,
  insertUserFacilitySchema,
  type Profile,
} from "@shared/schema";
import {
  getLegacyMedicalCouncilNumber,
  getProfessionalRegistrations,
  professionalRegistrationsSchema,
} from "@shared/professionalRegistrations";
import { sendPushNotification } from "./push";
import { env } from "./env";
import { z } from "zod";

// ── Auth validation schemas ──────────────────────────────────────────────────

const signupSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required").max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

// ── Profile validation schemas ───────────────────────────────────────────────

const profileUpdateSchema = insertProfileSchema
  .pick({
    fullName: true,
    firstName: true,
    lastName: true,
    dateOfBirth: true,
    sex: true,
    countryOfPractice: true,
    medicalCouncilNumber: true,
    professionalRegistrations: true,
    careerStage: true,
    onboardingComplete: true,
    surgicalPreferences: true,
  })
  .partial();

// Profile picture upload config
const uploadsDir = path.resolve(process.cwd(), "uploads", "avatars");
fs.mkdirSync(uploadsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req: AuthenticatedRequest, _file, cb) => {
    const ext = ".jpg"; // We'll accept any image but save as original extension
    const filename = `${req.userId}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/**
 * Safely resolve an avatar path, ensuring it's within the uploads directory.
 * Prevents path traversal attacks from malformed stored URLs.
 */
function safeAvatarPath(storedUrl: string): string | null {
  // Extract just the filename from the stored URL
  const filename = path.basename(storedUrl);
  if (!filename || filename === "." || filename === "..") return null;

  const resolved = path.join(uploadsDir, filename);
  // Verify the resolved path is still within uploadsDir
  if (!resolved.startsWith(uploadsDir + path.sep) && resolved !== uploadsDir) {
    return null;
  }
  return resolved;
}

// ── Facility validation schemas ──────────────────────────────────────────────

const facilityCreateSchema = insertUserFacilitySchema
  .pick({
    facilityName: true,
    facilityId: true,
    isPrimary: true,
  })
  .required({ facilityName: true })
  .extend({
    facilityId: z.string().nullable().optional(),
    isPrimary: z.boolean().optional().default(false),
  });

const facilityUpdateSchema = z.object({
  isPrimary: z.boolean(),
});

// ── Device key validation schemas ────────────────────────────────────────────

const deviceKeySchema = z.object({
  deviceId: z.string().min(1).max(64),
  publicKey: z.string().min(1),
  label: z.string().nullable().optional(),
});

const revokeDeviceKeySchema = z.object({
  deviceId: z.string().min(1).max(64),
});

// ── Sharing validation schemas ──────────────────────────────────────────────

const shareSchema = z.object({
  caseId: z.string().min(1),
  encryptedShareableBlob: z.string().min(1),
  recipients: z
    .array(
      z.object({
        userId: z.string().min(1),
        role: z.string().min(1).max(30),
        keyEnvelopes: z
          .array(
            z.object({
              deviceId: z.string().min(1),
              envelopeJson: z.string().min(1),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

const verifySchema = z.object({
  status: z.enum(["verified", "disputed"]),
  note: z.string().optional(),
});

const updateBlobSchema = z.object({
  encryptedShareableBlob: z.string().min(1),
  blobVersion: z.number().int().positive(),
});

const assessmentSchema = z.object({
  sharedCaseId: z.string().min(1),
  assessorRole: z.enum(["supervisor", "trainee"]),
  encryptedAssessment: z.string().min(1),
  keyEnvelopes: z
    .array(
      z.object({
        recipientUserId: z.string().min(1),
        recipientDeviceId: z.string().min(1),
        envelopeJson: z.string().min(1),
      }),
    )
    .min(1),
});

const pushTokenSchema = z.object({
  expoPushToken: z.string().min(1),
  deviceId: z.string().min(1).max(64),
  platform: z.string().max(10).optional(),
});

function parseJsonObject(
  value: unknown,
): { ok: true; value: Record<string, unknown> | undefined } | { ok: false } {
  if (value === undefined || value === null) {
    return { ok: true, value: undefined };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { ok: true, value: undefined };
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ok: true, value: parsed as Record<string, unknown> };
      }
      return { ok: false };
    } catch {
      return { ok: false };
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return { ok: true, value: value as Record<string, unknown> };
  }

  return { ok: false };
}

function serializeProfile(profile: Profile | undefined | null) {
  if (!profile) {
    return null;
  }

  const parsedPrefs = parseJsonObject(profile.surgicalPreferences);
  const parsedProfessionalRegistrations = parseJsonObject(
    profile.professionalRegistrations,
  );
  const professionalRegistrationsResult =
    professionalRegistrationsSchema.safeParse(
      parsedProfessionalRegistrations.ok
        ? (parsedProfessionalRegistrations.value ?? {})
        : {},
    );

  return {
    ...profile,
    surgicalPreferences: parsedPrefs.ok ? parsedPrefs.value : undefined,
    professionalRegistrations: getProfessionalRegistrations(
      professionalRegistrationsResult.success
        ? professionalRegistrationsResult.data
        : undefined,
      profile.medicalCouncilNumber,
      profile.countryOfPractice,
    ),
  };
}

const authRateLimiter = new Map<string, { count: number; resetTime: number }>();
const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW_MS = 60 * 1000;
const AUTH_RATE_LIMITER_MAX_ENTRIES = 5000;

const userSearchRateLimiter = new Map<
  string,
  { count: number; resetTime: number }
>();
const USER_SEARCH_RATE_LIMIT = 10;
const USER_SEARCH_RATE_WINDOW_MS = 60 * 1000;

// Periodic cleanup: evict expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authRateLimiter) {
    if (now > entry.resetTime) {
      authRateLimiter.delete(ip);
    }
  }
  for (const [key, entry] of userSearchRateLimiter) {
    if (now > entry.resetTime) {
      userSearchRateLimiter.delete(key);
    }
  }
}, 60_000).unref();

function cleanupRateLimiter(): void {
  if (authRateLimiter.size <= AUTH_RATE_LIMITER_MAX_ENTRIES) return;
  // Hard cap exceeded — evict oldest expired entries, then LRU if still over
  const now = Date.now();
  for (const [ip, entry] of authRateLimiter) {
    if (now > entry.resetTime) {
      authRateLimiter.delete(ip);
    }
  }
  // If still over cap after expiry eviction, drop oldest entries
  if (authRateLimiter.size > AUTH_RATE_LIMITER_MAX_ENTRIES) {
    const excess = authRateLimiter.size - AUTH_RATE_LIMITER_MAX_ENTRIES;
    const keys = authRateLimiter.keys();
    for (let i = 0; i < excess; i++) {
      const next = keys.next();
      if (!next.done) authRateLimiter.delete(next.value);
    }
  }
}

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = authRateLimiter.get(ip);

  if (!entry || now > entry.resetTime) {
    authRateLimiter.set(ip, { count: 1, resetTime: now + AUTH_RATE_WINDOW_MS });
    cleanupRateLimiter();
    return true;
  }

  if (entry.count >= AUTH_RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

function checkUserSearchRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = userSearchRateLimiter.get(userId);

  if (!entry || now > entry.resetTime) {
    userSearchRateLimiter.set(userId, {
      count: 1,
      resetTime: now + USER_SEARCH_RATE_WINDOW_MS,
    });
    return true;
  }

  if (entry.count >= USER_SEARCH_RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

// JWT_SECRET is validated by env.ts at startup (minimum 32 characters)
const JWT_SECRET = env.JWT_SECRET;

// Hash password reset tokens before storing in database
const hashResetToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: Function,
): Promise<void> => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as { userId: string; tokenVersion?: number };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const currentTokenVersion = user.tokenVersion ?? 0;
    if ((decoded.tokenVersion ?? 0) !== currentTokenVersion) {
      res.status(401).json({ error: "Token has been revoked" });
      return;
    }
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

export async function registerRoutes(app: Express): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────────
  // Health check
  // Consumer: Mobile client, uptime monitors
  // ──────────────────────────────────────────────────────────────────────────
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Auth Routes
  // Consumer: Mobile client (signup, login, password management)
  // ──────────────────────────────────────────────────────────────────────────
  app.post(
    "/api/auth/signup",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const clientIp = req.ip || req.socket.remoteAddress || "unknown";
        if (!checkAuthRateLimit(clientIp)) {
          res
            .status(429)
            .json({ error: "Too many requests. Please try again later." });
          return;
        }

        const parseResult = signupSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.flatten(),
          });
          return;
        }
        const { email, password } = parseResult.data;

        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          res.status(409).json({ error: "Email already registered" });
          return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await storage.createUser({
          email,
          password: hashedPassword,
        });

        await storage.createProfile({
          userId: user.id,
          onboardingComplete: false,
        });

        const token = jwt.sign(
          { userId: user.id, tokenVersion: user.tokenVersion ?? 0 },
          JWT_SECRET,
          { algorithm: "HS256", expiresIn: "7d" },
        );

        res.json({ token, user: { id: user.id, email: user.email } });
      } catch (error) {
        console.error(
          "Signup error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to create account" });
      }
    },
  );

  app.post(
    "/api/auth/login",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const clientIp = req.ip || req.socket.remoteAddress || "unknown";
        if (!checkAuthRateLimit(clientIp)) {
          res
            .status(429)
            .json({ error: "Too many requests. Please try again later." });
          return;
        }

        const parseResult = loginSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.flatten(),
          });
          return;
        }
        const { email, password } = parseResult.data;

        const user = await storage.getUserByEmail(email);
        if (!user) {
          res.status(401).json({ error: "Invalid email or password" });
          return;
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          res.status(401).json({ error: "Invalid email or password" });
          return;
        }

        const profile = await storage.getProfile(user.id);
        const facilities = await storage.getUserFacilities(user.id);
        const token = jwt.sign(
          { userId: user.id, tokenVersion: user.tokenVersion ?? 0 },
          JWT_SECRET,
          { algorithm: "HS256", expiresIn: "7d" },
        );

        res.json({
          token,
          user: { id: user.id, email: user.email },
          profile: serializeProfile(profile),
          facilities,
          onboardingComplete: profile?.onboardingComplete ?? false,
        });
      } catch (error) {
        console.error(
          "Login error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to login" });
      }
    },
  );

  app.get(
    "/api/auth/me",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const user = await storage.getUser(req.userId!);
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        const profile = await storage.getProfile(user.id);
        const facilities = await storage.getUserFacilities(user.id);

        res.json({
          user: { id: user.id, email: user.email },
          profile: serializeProfile(profile),
          facilities,
          onboardingComplete: profile?.onboardingComplete ?? false,
        });
      } catch (error) {
        console.error(
          "Auth check error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to check authentication" });
      }
    },
  );

  app.post(
    "/api/auth/refresh",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const user = await storage.getUser(req.userId!);
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        const token = jwt.sign(
          { userId: user.id, tokenVersion: user.tokenVersion ?? 0 },
          JWT_SECRET,
          { algorithm: "HS256", expiresIn: "7d" },
        );

        res.json({ token });
      } catch (error) {
        console.error(
          "Token refresh error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to refresh token" });
      }
    },
  );

  app.post(
    "/api/auth/change-password",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = changePasswordSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.flatten(),
          });
          return;
        }
        const { currentPassword, newPassword } = parseResult.data;

        const user = await storage.getUser(req.userId!);
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        const validPassword = await bcrypt.compare(
          currentPassword,
          user.password,
        );
        if (!validPassword) {
          res.status(401).json({ error: "Current password is incorrect" });
          return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await storage.updateUserPassword(req.userId!, hashedPassword);

        res.json({ success: true, message: "Password changed successfully" });
      } catch (error) {
        console.error(
          "Change password error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to change password" });
      }
    },
  );

  app.post(
    "/api/auth/request-password-reset",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const clientIp = req.ip || req.socket.remoteAddress || "unknown";
        if (!checkAuthRateLimit(clientIp)) {
          res
            .status(429)
            .json({ error: "Too many requests. Please try again later." });
          return;
        }

        const parseResult = requestPasswordResetSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.flatten(),
          });
          return;
        }
        const { email } = parseResult.data;

        const user = await storage.getUserByEmail(email);

        // Always return success for security (don't reveal if email exists)
        if (!user) {
          res.json({
            success: true,
            message: "If an account exists, reset instructions will be sent",
          });
          return;
        }

        // Clean up expired tokens
        await storage.deleteExpiredPasswordResetTokens();

        // Generate secure token and hash it before storing
        const token = randomBytes(32).toString("hex");
        const tokenHash = hashResetToken(token);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

        await storage.createPasswordResetToken(user.id, tokenHash, expiresAt);

        // Send password reset email via Resend (send plain token to user)
        const emailResult = await sendPasswordResetEmail(email, token);

        if (!emailResult.success) {
          console.error(
            "Failed to send password reset email:",
            emailResult.error,
          );
        }

        res.json({
          success: true,
          message: "If an account exists, reset instructions will be sent",
        });
      } catch (error) {
        console.error(
          "Password reset request error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res
          .status(500)
          .json({ error: "Failed to process password reset request" });
      }
    },
  );

  app.post(
    "/api/auth/reset-password",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const parseResult = resetPasswordSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.flatten(),
          });
          return;
        }
        const { token, newPassword } = parseResult.data;

        // Hash the incoming token to match against stored hash
        const resetToken = await storage.getPasswordResetToken(
          hashResetToken(token),
        );

        if (!resetToken) {
          res.status(400).json({ error: "Invalid or expired reset token" });
          return;
        }

        if (resetToken.used) {
          res
            .status(400)
            .json({ error: "This reset token has already been used" });
          return;
        }

        if (new Date() > resetToken.expiresAt) {
          res.status(400).json({ error: "Reset token has expired" });
          return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await storage.updateUserPassword(resetToken.userId, hashedPassword);
        await storage.markPasswordResetTokenUsed(resetToken.id);

        res.json({
          success: true,
          message: "Password has been reset successfully",
        });
      } catch (error) {
        console.error(
          "Password reset error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to reset password" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Account Deletion
  // Consumer: Mobile client (Settings -> Delete Account)
  // Apple App Store requirement: apps with account creation must offer deletion
  // ──────────────────────────────────────────────────────────────────────────
  app.delete(
    "/api/auth/account",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const { password } = req.body;
        if (!password || typeof password !== "string") {
          res.status(400).json({
            error: "Password is required to confirm account deletion",
          });
          return;
        }

        const user = await storage.getUser(req.userId!);
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          res.status(401).json({ error: "Password is incorrect" });
          return;
        }

        await storage.deleteUserAccount(req.userId!);
        res.json({ success: true, message: "Account deleted successfully" });
      } catch (error) {
        console.error(
          "Account deletion error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to delete account" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Profile Routes
  // Consumer: Mobile client (onboarding, settings)
  // Ownership: Implicit — always scoped to authenticated user
  // ──────────────────────────────────────────────────────────────────────────
  app.get(
    "/api/profile",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const profile = await storage.getProfile(req.userId!);
        res.json(serializeProfile(profile));
      } catch (error) {
        console.error(
          "Profile fetch error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch profile" });
      }
    },
  );

  app.put(
    "/api/profile",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const body = { ...req.body };
        if ("surgicalPreferences" in body) {
          const parsedPrefs = parseJsonObject(body.surgicalPreferences);
          if (!parsedPrefs.ok) {
            res.status(400).json({
              error: "Invalid profile data",
              details: { surgicalPreferences: ["Must be a JSON object"] },
            });
            return;
          }
          body.surgicalPreferences = parsedPrefs.value ?? {};
        }

        if ("professionalRegistrations" in body) {
          const parsedProfessionalRegistrations = parseJsonObject(
            body.professionalRegistrations,
          );
          if (!parsedProfessionalRegistrations.ok) {
            res.status(400).json({
              error: "Invalid profile data",
              details: {
                professionalRegistrations: ["Must be a JSON object"],
              },
            });
            return;
          }

          const registrationsResult = professionalRegistrationsSchema.safeParse(
            parsedProfessionalRegistrations.value ?? {},
          );
          if (!registrationsResult.success) {
            res.status(400).json({
              error: "Invalid profile data",
              details: registrationsResult.error.flatten(),
            });
            return;
          }

          body.professionalRegistrations = registrationsResult.data;
        }

        const parseResult = profileUpdateSchema.safeParse(body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid profile data",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const existingProfile = await storage.getProfile(req.userId!);
        const profileData = { ...parseResult.data };
        if ("professionalRegistrations" in profileData) {
          profileData.medicalCouncilNumber = getLegacyMedicalCouncilNumber(
            profileData.professionalRegistrations,
            profileData.countryOfPractice ??
              existingProfile?.countryOfPractice ??
              null,
          );
        }

        const profile = await storage.updateProfile(req.userId!, profileData);
        res.json(serializeProfile(profile));
      } catch (error) {
        console.error(
          "Profile update error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to update profile" });
      }
    },
  );

  // Profile picture upload
  app.post(
    "/api/profile/picture",
    authenticateToken,
    (req: AuthenticatedRequest, res: Response): void => {
      avatarUpload.single("picture")(req, res, async (err) => {
        if (err) {
          const message =
            err instanceof multer.MulterError
              ? err.code === "LIMIT_FILE_SIZE"
                ? "File too large (max 5MB)"
                : err.message
              : err.message || "Upload failed";
          res.status(400).json({ error: message });
          return;
        }

        if (!req.file) {
          res.status(400).json({ error: "No image file provided" });
          return;
        }

        try {
          // Delete old avatar file if it exists
          const existingProfile = await storage.getProfile(req.userId!);
          if (existingProfile?.profilePictureUrl) {
            const oldPath = safeAvatarPath(existingProfile.profilePictureUrl);
            if (oldPath && fs.existsSync(oldPath)) {
              await fs.promises.unlink(oldPath).catch(() => {});
            }
          }

          const pictureUrl = `/uploads/avatars/${req.file.filename}`;
          const profile = await storage.updateProfile(req.userId!, {
            profilePictureUrl: pictureUrl,
          });
          res.json(serializeProfile(profile));
        } catch (error) {
          console.error(
            "Profile picture upload error:",
            error instanceof Error ? error.message : "Unknown error",
          );
          res.status(500).json({ error: "Failed to upload profile picture" });
        }
      });
    },
  );

  app.delete(
    "/api/profile/picture",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const existingProfile = await storage.getProfile(req.userId!);
        if (existingProfile?.profilePictureUrl) {
          const oldPath = safeAvatarPath(existingProfile.profilePictureUrl);
          if (oldPath && fs.existsSync(oldPath)) {
            await fs.promises.unlink(oldPath).catch(() => {});
          }
        }
        const profile = await storage.updateProfile(req.userId!, {
          profilePictureUrl: null,
        });
        res.json(serializeProfile(profile));
      } catch (error) {
        console.error(
          "Profile picture delete error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to delete profile picture" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Facilities Routes
  // Consumer: Mobile client (onboarding, settings)
  // Ownership: Scoped to authenticated user via userId filter
  // ──────────────────────────────────────────────────────────────────────────
  app.get(
    "/api/facilities",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const facilities = await storage.getUserFacilities(req.userId!);
        res.json(facilities);
      } catch (error) {
        console.error(
          "Facilities fetch error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch facilities" });
      }
    },
  );

  app.post(
    "/api/facilities",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = facilityCreateSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid facility data",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const facility = await storage.createUserFacility({
          userId: req.userId!,
          facilityName: parseResult.data.facilityName,
          facilityId: parseResult.data.facilityId ?? null,
          isPrimary: parseResult.data.isPrimary,
        });
        res.json(facility);
      } catch (error) {
        console.error(
          "Facility create error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to create facility" });
      }
    },
  );

  app.put(
    "/api/facilities/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = facilityUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid facility data",
            details: parseResult.error.flatten(),
          });
          return;
        }
        const userId = req.userId!;
        const facilityId = req.params.id!;
        const { isPrimary } = parseResult.data;

        // If setting as primary, unset all other facilities in a single query
        if (isPrimary) {
          await storage.clearPrimaryFacilities(userId, facilityId);
        }

        const updated = await storage.updateUserFacility(facilityId, userId, {
          isPrimary: isPrimary ?? false,
        });
        if (!updated) {
          res.status(404).json({ error: "Facility not found" });
          return;
        }
        res.json(updated);
      } catch (error) {
        console.error(
          "Facility update error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to update facility" });
      }
    },
  );

  // IMPROVEMENT: IDOR fix — pass userId to enforce ownership at the query level
  app.delete(
    "/api/facilities/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const deleted = await storage.deleteUserFacility(
          req.params.id!,
          req.userId!,
        );
        if (!deleted) {
          res.status(404).json({ error: "Facility not found" });
          return;
        }
        res.json({ success: true });
      } catch (error) {
        console.error(
          "Facility delete error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to delete facility" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Device Key Routes (E2EE scaffolding)
  // Consumer: Mobile client (planned — key registration for end-to-end encryption)
  // Status: Active — scaffolding for E2EE feature, used during device registration
  // ──────────────────────────────────────────────────────────────────────────
  app.post(
    "/api/keys/device",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = deviceKeySchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid device key data",
            details: parseResult.error.flatten(),
          });
          return;
        }
        const { deviceId, publicKey, label } = parseResult.data;

        const key = await storage.upsertUserDeviceKey(
          req.userId!,
          deviceId,
          publicKey,
          label ?? null,
        );

        res.json({ success: true, keyId: key.id });
      } catch (error) {
        console.error(
          "Device key upsert error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to register device key" });
      }
    },
  );

  // Consumer: Mobile client (planned — list registered device keys)
  // Status: Active — E2EE scaffolding
  app.get(
    "/api/keys/me",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const keys = await storage.getUserDeviceKeys(req.userId!);
        res.json(keys);
      } catch (error) {
        console.error(
          "Device key fetch error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch device keys" });
      }
    },
  );

  // Consumer: Mobile client (planned — revoke a device key)
  // Status: Active — E2EE scaffolding
  app.post(
    "/api/keys/revoke",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = revokeDeviceKeySchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid request",
            details: parseResult.error.flatten(),
          });
          return;
        }

        await storage.revokeUserDeviceKey(
          req.userId!,
          parseResult.data.deviceId,
        );
        res.json({ success: true });
      } catch (error) {
        console.error(
          "Device key revoke error:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to revoke device key" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // SNOMED Reference Data API
  // Consumer: Mobile client (procedure entry — flap types, vessels, regions, etc.)
  // These endpoints serve the curated SNOMED CT reference picklists for case entry UI.
  // ──────────────────────────────────────────────────────────────────────────
  app.get(
    "/api/snomed-ref",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { category, anatomicalRegion, specialty } = req.query;
        const refs = await storage.getSnomedRefs(
          category as string | undefined,
          anatomicalRegion as string | undefined,
          specialty as string | undefined,
        );
        res.json(refs);
      } catch (error) {
        console.error(
          "Error fetching SNOMED refs:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch reference data" });
      }
    },
  );

  app.get(
    "/api/snomed-ref/vessels/:region",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { region } = req.params;
        const { subcategory } = req.query;

        let refs = await storage.getSnomedRefs("vessel", region);

        if (subcategory) {
          refs = refs.filter((r) => r.subcategory === subcategory);
        }

        res.json(refs);
      } catch (error) {
        console.error(
          "Error fetching vessels:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch vessels" });
      }
    },
  );

  app.get(
    "/api/snomed-ref/regions",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const refs = await storage.getSnomedRefs("anatomical_region");
        res.json(refs);
      } catch (error) {
        console.error(
          "Error fetching regions:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch regions" });
      }
    },
  );

  app.get(
    "/api/snomed-ref/flap-types",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const refs = await storage.getSnomedRefs("flap");
        res.json(refs);
      } catch (error) {
        console.error(
          "Error fetching flap types:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch flap types" });
      }
    },
  );

  app.get(
    "/api/snomed-ref/donor-vessels/:flapType",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { flapType } = req.params;
        const refs = await storage.getSnomedRefs("donor_vessel", flapType);
        res.json(refs);
      } catch (error) {
        console.error(
          "Error fetching donor vessels:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch donor vessels" });
      }
    },
  );

  app.get(
    "/api/snomed-ref/compositions",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const refs = await storage.getSnomedRefs("composition");
        res.json(refs);
      } catch (error) {
        console.error(
          "Error fetching compositions:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch compositions" });
      }
    },
  );

  app.get(
    "/api/snomed-ref/coupling-methods",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const refs = await storage.getSnomedRefs("coupling_method");
        res.json(refs);
      } catch (error) {
        console.error(
          "Error fetching coupling methods:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch coupling methods" });
      }
    },
  );

  app.get(
    "/api/snomed-ref/anastomosis-configs",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const refs = await storage.getSnomedRefs("anastomosis_config");
        res.json(refs);
      } catch (error) {
        console.error(
          "Error fetching anastomosis configs:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch anastomosis configs" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Seed Data Endpoint
  // Consumer: Developer-only (run once to populate SNOMED reference data)
  // IMPROVEMENT #1: Environment-gated — disabled entirely unless ENABLE_SEED=true
  // ──────────────────────────────────────────────────────────────────────────
  if (env.ENABLE_SEED === "true") {
    app.post(
      "/api/seed-snomed-ref",
      authenticateToken,
      async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
          // Additional seed token protection
          const seedHeader = req.header("x-seed-token");
          const seedToken = env.SEED_TOKEN;

          if (seedToken && seedHeader !== seedToken) {
            res.status(403).json({ error: "Forbidden" });
            return;
          }

          // Check if data already exists
          const existing = await storage.getSnomedRefs();
          if (existing.length > 0) {
            res.json({
              message: "Data already seeded",
              count: existing.length,
            });
            return;
          }

          const created = await storage.bulkCreateSnomedRefs(allSeedData);
          res.json({
            message: "Seed data created successfully",
            count: created.length,
          });
        } catch (error) {
          console.error(
            "Error seeding SNOMED refs:",
            error instanceof Error ? error.message : "Unknown error",
          );
          res.status(500).json({ error: "Failed to seed reference data" });
        }
      },
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SNOMED CT Live Search API (using Ontoserver FHIR endpoint)
  // Consumer: Mobile client (procedure/diagnosis search during case entry)
  // These hit the external Ontoserver for free-text SNOMED CT lookups.
  // ──────────────────────────────────────────────────────────────────────────
  app.get(
    "/api/snomed/procedures",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const { q, specialty, limit } = req.query;

        if (!q || typeof q !== "string") {
          res.json([]);
          return;
        }

        const results = await searchProcedures(
          q,
          specialty as string | undefined,
          limit ? parseInt(limit as string, 10) : 20,
        );

        res.json(results);
      } catch (error) {
        console.error(
          "Error searching SNOMED procedures:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to search procedures" });
      }
    },
  );

  app.get(
    "/api/snomed/diagnoses",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const { q, specialty, limit } = req.query;

        if (!q || typeof q !== "string") {
          res.json([]);
          return;
        }

        const results = await searchDiagnoses(
          q,
          specialty as string | undefined,
          limit ? parseInt(limit as string, 10) : 20,
        );

        res.json(results);
      } catch (error) {
        console.error(
          "Error searching SNOMED diagnoses:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to search diagnoses" });
      }
    },
  );

  // Consumer: Mobile client (planned — concept detail view / cross-reference)
  // Status: Active — used for displaying full SNOMED CT concept metadata
  app.get(
    "/api/snomed/concepts/:conceptId",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const conceptId = req.params.conceptId!;
        const details = await getConceptDetails(conceptId);

        if (!details) {
          res.status(404).json({ error: "Concept not found" });
          return;
        }

        res.json(details);
      } catch (error) {
        console.error(
          "Error fetching concept details:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch concept details" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Diagnosis Staging Configuration API
  // Consumer: Mobile client (diagnosis entry — dynamic staging forms)
  // Returns staging system definitions (TNM, Clark, Breslow, etc.) for a diagnosis.
  // ──────────────────────────────────────────────────────────────────────────
  app.get(
    "/api/staging/diagnosis",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { snomedCode, diagnosisName } = req.query;

        const staging = getStagingForDiagnosis(
          snomedCode as string | undefined,
          diagnosisName as string | undefined,
        );

        res.json(staging || { stagingSystems: [] });
      } catch (error) {
        console.error(
          "Error fetching staging config:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res
          .status(500)
          .json({ error: "Failed to fetch staging configuration" });
      }
    },
  );

  // Consumer: Mobile client (planned — staging reference browser)
  // Status: Active — returns all configured staging systems for reference
  app.get(
    "/api/staging/all",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const configs = getAllStagingConfigs();
        res.json(configs);
      } catch (error) {
        console.error(
          "Error fetching all staging configs:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res
          .status(500)
          .json({ error: "Failed to fetch staging configurations" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Team Sharing Routes
  // Consumer: Mobile client (case sharing, verification, blinded assessments)
  // ──────────────────────────────────────────────────────────────────────────

  // Share a case with team members
  app.post(
    "/api/share",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = shareSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const { caseId, encryptedShareableBlob, recipients } =
          parseResult.data;
        const ownerUserId = req.userId!;

        const sharedCases: { id: string; recipientUserId: string }[] = [];

        for (const recipient of recipients) {
          // Owner cannot share with themselves
          if (recipient.userId === ownerUserId) {
            res
              .status(400)
              .json({ error: "Cannot share a case with yourself" });
            return;
          }

          // Verify recipient exists
          const recipientUser = await storage.getUser(recipient.userId);
          if (!recipientUser) {
            res.status(400).json({
              error: `Recipient ${recipient.userId} not found`,
            });
            return;
          }

          const sharedCase = await storage.createSharedCase({
            caseId,
            ownerUserId,
            recipientUserId: recipient.userId,
            encryptedShareableBlob,
            recipientRole: recipient.role,
          });

          const envelopes = recipient.keyEnvelopes.map((ke) => ({
            sharedCaseId: sharedCase.id,
            recipientUserId: recipient.userId,
            recipientDeviceId: ke.deviceId,
            envelopeJson: ke.envelopeJson,
          }));

          await storage.createCaseKeyEnvelopes(envelopes);

          sharedCases.push({
            id: sharedCase.id,
            recipientUserId: recipient.userId,
          });

          // Fire push notification (non-blocking)
          sendPushNotification(
            recipient.userId,
            "Case Shared",
            "A colleague has shared a case with you",
            { type: "case_shared", sharedCaseId: sharedCase.id },
          ).catch(() => {});
        }

        res.status(201).json({ sharedCases });
      } catch (error) {
        console.error(
          "Error sharing case:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to share case" });
      }
    },
  );

  // Get cases shared with the current user (inbox)
  app.get(
    "/api/shared/inbox",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const status = req.query.status as string | undefined;
        const limit = Math.min(
          parseInt(req.query.limit as string) || 50,
          100,
        );
        const offset = parseInt(req.query.offset as string) || 0;

        const cases = await storage.getSharedInbox(req.userId!, {
          status,
          limit,
          offset,
        });

        // Strip the blob from list view for bandwidth efficiency
        const result = cases.map(
          ({ encryptedShareableBlob: _blob, ...rest }) => rest,
        );
        res.json(result);
      } catch (error) {
        console.error(
          "Error fetching shared inbox:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch shared inbox" });
      }
    },
  );

  // Download a specific shared case blob + envelopes
  app.get(
    "/api/shared/inbox/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const sharedCase = await storage.getSharedCaseById(req.params.id!);
        if (!sharedCase) {
          res.status(404).json({ error: "Shared case not found" });
          return;
        }

        // IDOR: only the recipient can access
        if (sharedCase.recipientUserId !== req.userId!) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const keyEnvelopes = await storage.getCaseKeyEnvelopes(
          sharedCase.id,
          req.userId!,
        );

        res.json({
          encryptedShareableBlob: sharedCase.encryptedShareableBlob,
          keyEnvelopes: keyEnvelopes.map((ke) => ({
            recipientDeviceId: ke.recipientDeviceId,
            envelopeJson: ke.envelopeJson,
          })),
          blobVersion: sharedCase.blobVersion,
          recipientRole: sharedCase.recipientRole,
          verificationStatus: sharedCase.verificationStatus,
        });
      } catch (error) {
        console.error(
          "Error fetching shared case:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch shared case" });
      }
    },
  );

  // Get cases the current user shared with others (outbox)
  app.get(
    "/api/shared/outbox",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const cases = await storage.getSharedOutbox(req.userId!);

        // Strip the blob from list view
        const result = cases.map(
          ({ encryptedShareableBlob: _blob, ...rest }) => rest,
        );
        res.json(result);
      } catch (error) {
        console.error(
          "Error fetching shared outbox:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch shared outbox" });
      }
    },
  );

  // Verify or dispute involvement in a shared case
  app.put(
    "/api/shared/:id/verify",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = verifySchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const updated = await storage.updateSharedCaseVerification(
          req.params.id!,
          req.userId!,
          parseResult.data.status,
          parseResult.data.note,
        );

        if (!updated) {
          res.status(404).json({ error: "Shared case not found" });
          return;
        }

        res.json(updated);
      } catch (error) {
        console.error(
          "Error verifying shared case:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to verify shared case" });
      }
    },
  );

  // Revoke sharing (owner only — cascade deletes envelopes)
  app.delete(
    "/api/shared/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const deleted = await storage.deleteSharedCase(
          req.params.id!,
          req.userId!,
        );

        if (!deleted) {
          res.status(404).json({ error: "Shared case not found" });
          return;
        }

        res.json({ success: true });
      } catch (error) {
        console.error(
          "Error revoking shared case:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to revoke shared case" });
      }
    },
  );

  // Update shared case blob (owner only, optimistic locking)
  app.put(
    "/api/shared/:id/blob",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = updateBlobSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const updated = await storage.updateSharedCaseBlob(
          req.params.id!,
          req.userId!,
          parseResult.data.encryptedShareableBlob,
          parseResult.data.blobVersion,
        );

        if (!updated) {
          res.status(409).json({
            error: "Version conflict or shared case not found",
          });
          return;
        }

        res.json(updated);
      } catch (error) {
        console.error(
          "Error updating shared case blob:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to update shared case" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // User Lookup Routes
  // Consumer: Mobile client (find team members by email for sharing)
  // ──────────────────────────────────────────────────────────────────────────

  // Search by exact email — returns user info + public keys for E2EE
  app.get(
    "/api/users/search",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        if (!checkUserSearchRateLimit(req.userId!)) {
          res
            .status(429)
            .json({ error: "Too many requests. Please try again later." });
          return;
        }

        const email = req.query.email as string;
        if (!email) {
          res.status(400).json({ error: "Email query parameter is required" });
          return;
        }

        const user = await storage.getUserByEmail(email);
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        const profile = await storage.getProfile(user.id);
        const deviceKeys = await storage.getUserDeviceKeys(user.id);

        res.json({
          id: user.id,
          displayName: profile?.fullName ?? null,
          publicKeys: deviceKeys.map((dk) => ({
            deviceId: dk.deviceId,
            publicKey: dk.publicKey,
          })),
        });
      } catch (error) {
        console.error(
          "Error searching users:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to search users" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Assessment Routes
  // Consumer: Mobile client (blinded supervisor/trainee assessments)
  // ──────────────────────────────────────────────────────────────────────────

  // Submit an assessment (blinded until both parties submit)
  app.post(
    "/api/assessments",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = assessmentSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const { sharedCaseId, assessorRole, encryptedAssessment, keyEnvelopes } =
          parseResult.data;

        // Verify the shared case exists
        const sharedCase = await storage.getSharedCaseById(sharedCaseId);
        if (!sharedCase) {
          res.status(404).json({ error: "Shared case not found" });
          return;
        }

        const assessment = await storage.createCaseAssessment({
          sharedCaseId,
          assessorUserId: req.userId!,
          assessorRole,
          encryptedAssessment,
        });

        const envelopeRows = keyEnvelopes.map((ke) => ({
          caseAssessmentId: assessment.id,
          recipientUserId: ke.recipientUserId,
          recipientDeviceId: ke.recipientDeviceId,
          envelopeJson: ke.envelopeJson,
        }));

        await storage.createAssessmentKeyEnvelopes(envelopeRows);

        // Check if both roles have submitted → reveal
        const allAssessments =
          await storage.getCaseAssessments(sharedCaseId);
        const unrevealed = allAssessments.filter((a) => !a.revealedAt);
        let revealed = false;

        if (unrevealed.length >= 2) {
          await storage.revealAssessments(sharedCaseId);
          await storage.releaseAssessmentKeyEnvelopes(sharedCaseId);
          revealed = true;

          // Notify both parties that assessments are revealed
          const otherAssessment = unrevealed.find(
            (a) => a.assessorUserId !== req.userId!,
          );
          if (otherAssessment) {
            sendPushNotification(
              otherAssessment.assessorUserId,
              "Assessments Revealed",
              "Both assessments are now available for review",
              {
                type: "assessments_revealed",
                sharedCaseId,
              },
            ).catch(() => {});
          }
          sendPushNotification(
            req.userId!,
            "Assessments Revealed",
            "Both assessments are now available for review",
            { type: "assessments_revealed", sharedCaseId },
          ).catch(() => {});
        }

        res.status(201).json({ id: assessment.id, revealed });
      } catch (error) {
        console.error(
          "Error submitting assessment:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to submit assessment" });
      }
    },
  );

  // Get assessment status for a shared case
  app.get(
    "/api/assessments/:sharedCaseId",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const sharedCaseId = req.params.sharedCaseId!;
        const assessments = await storage.getCaseAssessments(sharedCaseId);

        const myAssessment = assessments.find(
          (a) => a.assessorUserId === req.userId!,
        );
        const otherAssessment = assessments.find(
          (a) => a.assessorUserId !== req.userId!,
        );

        let otherEnvelopes: { recipientDeviceId: string; envelopeJson: string }[] = [];
        if (otherAssessment) {
          const envelopes = await storage.getAssessmentKeyEnvelopes(
            otherAssessment.id,
            req.userId!,
            true, // released only
          );
          otherEnvelopes = envelopes.map((e) => ({
            recipientDeviceId: e.recipientDeviceId,
            envelopeJson: e.envelopeJson,
          }));
        }

        res.json({
          myAssessment: myAssessment
            ? {
                id: myAssessment.id,
                assessorRole: myAssessment.assessorRole,
                submittedAt: myAssessment.submittedAt,
                revealedAt: myAssessment.revealedAt,
              }
            : null,
          otherAssessment: otherAssessment
            ? {
                id: otherAssessment.id,
                assessorRole: otherAssessment.assessorRole,
                submittedAt: otherAssessment.submittedAt,
                revealedAt: otherAssessment.revealedAt,
                keyEnvelopes:
                  otherAssessment.revealedAt ? otherEnvelopes : [],
              }
            : null,
        });
      } catch (error) {
        console.error(
          "Error fetching assessments:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch assessments" });
      }
    },
  );

  // Get revealed assessment history
  app.get(
    "/api/assessments/history",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const role = req.query.role as string | undefined;
        const limit = Math.min(
          parseInt(req.query.limit as string) || 50,
          100,
        );
        const offset = parseInt(req.query.offset as string) || 0;

        const results = await storage.getRevealedAssessments(req.userId!, {
          role,
          limit,
          offset,
        });

        res.json(results);
      } catch (error) {
        console.error(
          "Error fetching assessment history:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch assessment history" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Push Token Routes
  // Consumer: Mobile client (register/unregister push notification tokens)
  // ──────────────────────────────────────────────────────────────────────────

  // Register or update a push token
  app.post(
    "/api/push-tokens",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = pushTokenSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const token = await storage.upsertPushToken(
          req.userId!,
          parseResult.data.expoPushToken,
          parseResult.data.deviceId,
          parseResult.data.platform,
        );

        res.status(201).json(token);
      } catch (error) {
        console.error(
          "Error registering push token:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to register push token" });
      }
    },
  );

  // Remove a push token
  app.delete(
    "/api/push-tokens/:deviceId",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const deleted = await storage.deletePushToken(
          req.userId!,
          req.params.deviceId!,
        );

        if (!deleted) {
          res.status(404).json({ error: "Push token not found" });
          return;
        }

        res.json({ success: true });
      } catch (error) {
        console.error(
          "Error removing push token:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to remove push token" });
      }
    },
  );
}
