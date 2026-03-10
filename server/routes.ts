import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
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
  insertProcedureSchema,
  insertCaseProcedureSchema,
  insertFlapSchema,
  insertAnastomosisSchema,
  insertUserFacilitySchema,
  insertProcedureOutcomeSchema,
  type Profile,
} from "@shared/schema";
import {
  getLegacyMedicalCouncilNumber,
  getProfessionalRegistrations,
  professionalRegistrationsSchema,
} from "@shared/professionalRegistrations";
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

// ── Procedure validation schemas ─────────────────────────────────────────────
const procedureCreateSchema = insertProcedureSchema.extend({
  procedureDate: z.coerce.date(),
  startTime: z.coerce.date().optional().nullable(),
  endTime: z.coerce.date().optional().nullable(),
});
const procedureUpdateSchema = insertProcedureSchema
  .extend({
    procedureDate: z.coerce.date().optional(),
    startTime: z.coerce.date().optional().nullable(),
    endTime: z.coerce.date().optional().nullable(),
  })
  .partial()
  .omit({ userId: true });

const nestedCaseProcedureSchema = insertCaseProcedureSchema.omit({
  caseId: true,
});
const nestedAnastomosisSchema = insertAnastomosisSchema.omit({
  flapId: true,
});
const nestedFlapSchema = insertFlapSchema
  .omit({ procedureId: true })
  .extend({
    anastomoses: z.array(nestedAnastomosisSchema).optional(),
  });
const procedureCreateWithNestedSchema = procedureCreateSchema.extend({
  caseProcedures: z.array(nestedCaseProcedureSchema).optional(),
  flaps: z.array(nestedFlapSchema).optional(),
});

// ── Flap/Anastomosis validation schemas ──────────────────────────────────────
const flapCreateSchema = insertFlapSchema;
const flapUpdateSchema = insertFlapSchema.partial().omit({ procedureId: true });
const anastomosisCreateSchema = insertAnastomosisSchema;
const anastomosisUpdateSchema = insertAnastomosisSchema
  .partial()
  .omit({ flapId: true });
const procedureOutcomeCreateSchema = insertProcedureOutcomeSchema;
const procedureOutcomeUpdateSchema = insertProcedureOutcomeSchema
  .partial()
  .omit({ caseProcedureId: true });

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
const AUTH_RATE_LIMITER_MAX_ENTRIES = 1000;

function cleanupRateLimiter(): void {
  if (authRateLimiter.size <= AUTH_RATE_LIMITER_MAX_ENTRIES) return;
  const now = Date.now();
  for (const [ip, entry] of authRateLimiter) {
    if (now > entry.resetTime) {
      authRateLimiter.delete(ip);
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

export async function registerRoutes(app: Express): Promise<Server> {
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
            const oldPath = path.resolve(
              process.cwd(),
              existingProfile.profilePictureUrl.replace(/^\//, ""),
            );
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
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
          const oldPath = path.resolve(
            process.cwd(),
            existingProfile.profilePictureUrl.replace(/^\//, ""),
          );
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
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
  // Procedures CRUD API
  // Consumer: Mobile client (case entry — procedure-level CRUD)
  // Ownership: Verified via userId on procedures table
  // ──────────────────────────────────────────────────────────────────────────

  // GET /api/procedures — list user's procedures
  app.get(
    "/api/procedures",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.userId!;
        const limit = Math.min(
          Number(req.query.limit) || 50,
          200,
        );
        const offset = Number(req.query.offset) || 0;
        const result = await storage.getProceduresByUser(userId, limit, offset);
        res.json(result);
      } catch (error) {
        console.error("Error fetching procedures:", error);
        res.status(500).json({ error: "Failed to fetch procedures" });
      }
    },
  );

  // GET /api/procedures/:id — fetch with relations
  app.get(
    "/api/procedures/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.userId!;
        const { id } = req.params;
        const result = await storage.getProcedureWithRelations(id!, userId);
        if (!result) {
          res.status(404).json({ error: "Procedure not found" });
          return;
        }
        res.json(result);
      } catch (error) {
        console.error("Error fetching procedure:", error);
        res.status(500).json({ error: "Failed to fetch procedure" });
      }
    },
  );

  // POST /api/procedures — create with optional nested caseProcedures/flaps
  app.post(
    "/api/procedures",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.userId!;
        const parseResult = procedureCreateWithNestedSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid procedure data",
            details: parseResult.error.errors,
          });
          return;
        }

        const { caseProcedures: nestedCPs, flaps: nestedFlaps, ...procedureData } =
          parseResult.data;

        const result = await storage.createProcedureWithNested(
          { ...procedureData, userId },
          nestedCPs,
          nestedFlaps,
        );

        res.status(201).json(result);
      } catch (error) {
        console.error("Error creating procedure:", error);
        res.status(500).json({ error: "Failed to create procedure" });
      }
    },
  );

  // PUT /api/procedures/:id — update procedure fields only
  app.put(
    "/api/procedures/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.userId!;
        const { id } = req.params;
        const parseResult = procedureUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid procedure data",
            details: parseResult.error.errors,
          });
          return;
        }

        const hasAccess = await storage.verifyProcedureOwnership(id!, userId);
        if (!hasAccess) {
          res.status(404).json({ error: "Procedure not found" });
          return;
        }

        const updated = await storage.updateProcedure(id!, parseResult.data);
        if (!updated) {
          res.status(404).json({ error: "Procedure not found" });
          return;
        }
        res.json(updated);
      } catch (error) {
        console.error("Error updating procedure:", error);
        res.status(500).json({ error: "Failed to update procedure" });
      }
    },
  );

  // DELETE /api/procedures/:id — delete with cascades
  app.delete(
    "/api/procedures/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.userId!;
        const { id } = req.params;
        const deleted = await storage.deleteProcedure(id!, userId);
        if (!deleted) {
          res.status(404).json({ error: "Procedure not found" });
          return;
        }
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting procedure:", error);
        res.status(500).json({ error: "Failed to delete procedure" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Flaps CRUD API
  // Consumer: Mobile client (free flap case entry — flap details)
  // Ownership: Verified via procedure → user ownership chain
  // ──────────────────────────────────────────────────────────────────────────
  app.get(
    "/api/procedures/:procedureId/flaps",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const procedureId = req.params.procedureId!;
        const userId = req.userId!;

        // Verify user owns this procedure
        const hasAccess = await storage.verifyProcedureOwnership(
          procedureId,
          userId,
        );
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const flaps = await storage.getFlapsByProcedure(procedureId);
        res.json(flaps);
      } catch (error) {
        console.error(
          "Error fetching flaps:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch flaps" });
      }
    },
  );

  app.post(
    "/api/flaps",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = flapCreateSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid flap data",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const userId = req.userId!;
        const { procedureId } = parseResult.data;

        // Verify user owns the parent procedure
        const hasAccess = await storage.verifyProcedureOwnership(
          procedureId,
          userId,
        );
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const flap = await storage.createFlap(parseResult.data);
        res.json(flap);
      } catch (error) {
        console.error(
          "Error creating flap:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to create flap" });
      }
    },
  );

  app.put(
    "/api/flaps/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = flapUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid flap data",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const id = req.params.id!;
        const userId = req.userId!;

        // Verify user owns this flap via its procedure
        const hasAccess = await storage.verifyFlapOwnership(id, userId);
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const flap = await storage.updateFlap(id, parseResult.data);
        if (!flap) {
          res.status(404).json({ error: "Flap not found" });
          return;
        }
        res.json(flap);
      } catch (error) {
        console.error(
          "Error updating flap:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to update flap" });
      }
    },
  );

  app.delete(
    "/api/flaps/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const id = req.params.id!;
        const userId = req.userId!;

        // Verify user owns this flap via its procedure
        const hasAccess = await storage.verifyFlapOwnership(id, userId);
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        await storage.deleteFlap(id);
        res.json({ success: true });
      } catch (error) {
        console.error(
          "Error deleting flap:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to delete flap" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Anastomoses CRUD API
  // Consumer: Mobile client (free flap case entry — anastomosis details)
  // Ownership: Verified via anastomosis → flap → procedure → user chain
  // ──────────────────────────────────────────────────────────────────────────
  app.get(
    "/api/flaps/:flapId/anastomoses",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const flapId = req.params.flapId!;
        const userId = req.userId!;

        // Verify user owns this flap via its procedure
        const hasAccess = await storage.verifyFlapOwnership(flapId, userId);
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const anastomoses = await storage.getAnastomosesByFlap(flapId);
        res.json(anastomoses);
      } catch (error) {
        console.error(
          "Error fetching anastomoses:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch anastomoses" });
      }
    },
  );

  app.post(
    "/api/anastomoses",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = anastomosisCreateSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid anastomosis data",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const userId = req.userId!;
        const { flapId } = parseResult.data;

        // Verify user owns the parent flap
        const hasAccess = await storage.verifyFlapOwnership(flapId, userId);
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const anastomosis = await storage.createAnastomosis(parseResult.data);
        res.json(anastomosis);
      } catch (error) {
        console.error(
          "Error creating anastomosis:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to create anastomosis" });
      }
    },
  );

  app.put(
    "/api/anastomoses/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = anastomosisUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid anastomosis data",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const id = req.params.id!;
        const userId = req.userId!;

        // Verify user owns this anastomosis via flap -> procedure chain
        const hasAccess = await storage.verifyAnastomosisOwnership(id, userId);
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const anastomosis = await storage.updateAnastomosis(
          id,
          parseResult.data,
        );
        if (!anastomosis) {
          res.status(404).json({ error: "Anastomosis not found" });
          return;
        }
        res.json(anastomosis);
      } catch (error) {
        console.error(
          "Error updating anastomosis:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to update anastomosis" });
      }
    },
  );

  app.delete(
    "/api/anastomoses/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const id = req.params.id!;
        const userId = req.userId!;

        // Verify user owns this anastomosis via flap -> procedure chain
        const hasAccess = await storage.verifyAnastomosisOwnership(id, userId);
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        await storage.deleteAnastomosis(id);
        res.json({ success: true });
      } catch (error) {
        console.error(
          "Error deleting anastomosis:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to delete anastomosis" });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PROCEDURE OUTCOMES CRUD
  // Consumer: Mobile client (flap outcome documentation, registry export)
  // Ownership: caseProcedureId → caseProcedures.caseId → procedures.userId
  // ──────────────────────────────────────────────────────────────────────────

  // GET /api/procedure-outcomes/:caseProcedureId — list outcomes for a case procedure
  app.get(
    "/api/procedure-outcomes/:caseProcedureId",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const caseProcedureId = req.params.caseProcedureId!;
        const userId = req.userId!;
        const hasAccess = await storage.verifyCaseProcedureOwnership(
          caseProcedureId,
          userId,
        );
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const outcomes =
          await storage.getProcedureOutcomesByCaseProcedure(caseProcedureId);
        const parsed = outcomes.map((o) => ({
          ...o,
          details: (() => {
            const parsedDetails = parseJsonObject(o.details);
            return parsedDetails.ok ? (parsedDetails.value ?? {}) : {};
          })(),
        }));
        res.json(parsed);
      } catch (error) {
        console.error(
          "Error fetching procedure outcomes:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch procedure outcomes" });
      }
    },
  );

  // POST /api/procedure-outcomes — create a procedure outcome
  app.post(
    "/api/procedure-outcomes",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.userId!;
        const body = { ...req.body };
        if ("details" in body) {
          const parsedDetails = parseJsonObject(body.details);
          if (!parsedDetails.ok) {
            res.status(400).json({
              error: "Invalid outcome data",
              details: { details: ["Must be a JSON object"] },
            });
            return;
          }
          body.details = parsedDetails.value ?? {};
        }

        const parseResult = procedureOutcomeCreateSchema.safeParse(body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid outcome data",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const hasAccess = await storage.verifyCaseProcedureOwnership(
          parseResult.data.caseProcedureId,
          userId,
        );
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const outcome = await storage.createProcedureOutcome(parseResult.data);
        const parsedDetails = parseJsonObject(outcome.details);
        res.status(201).json({
          ...outcome,
          details: parsedDetails.ok ? (parsedDetails.value ?? {}) : {},
        });
      } catch (error) {
        console.error(
          "Error creating procedure outcome:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to create procedure outcome" });
      }
    },
  );

  // PUT /api/procedure-outcomes/:id — update a procedure outcome
  app.put(
    "/api/procedure-outcomes/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const id = req.params.id!;
        const userId = req.userId!;

        const hasAccess = await storage.verifyProcedureOutcomeOwnership(
          id,
          userId,
        );
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const body = { ...req.body };
        if ("details" in body) {
          const parsedDetails = parseJsonObject(body.details);
          if (!parsedDetails.ok) {
            res.status(400).json({
              error: "Invalid outcome data",
              details: { details: ["Must be a JSON object"] },
            });
            return;
          }
          body.details = parsedDetails.value ?? {};
        }

        const parseResult = procedureOutcomeUpdateSchema.safeParse(body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid outcome data",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const outcome = await storage.updateProcedureOutcome(
          id,
          parseResult.data,
        );
        if (!outcome) {
          res.status(404).json({ error: "Outcome not found" });
          return;
        }
        const parsedDetails = parseJsonObject(outcome.details);
        res.json({
          ...outcome,
          details: parsedDetails.ok ? (parsedDetails.value ?? {}) : {},
        });
      } catch (error) {
        console.error(
          "Error updating procedure outcome:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to update procedure outcome" });
      }
    },
  );

  // DELETE /api/procedure-outcomes/:id — delete a procedure outcome
  app.delete(
    "/api/procedure-outcomes/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const id = req.params.id!;
        const userId = req.userId!;

        const hasAccess = await storage.verifyProcedureOutcomeOwnership(
          id,
          userId,
        );
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        await storage.deleteProcedureOutcome(id);
        res.json({ success: true });
      } catch (error) {
        console.error(
          "Error deleting procedure outcome:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to delete procedure outcome" });
      }
    },
  );

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
  // Treatment Episode Routes (encrypted server-side storage)
  // Consumer: Mobile client (episode sync)
  // ──────────────────────────────────────────────────────────────────────────

  const episodeBodySchema = z.object({
    id: z.string().min(1),
    encryptedData: z.string().min(1),
    patientIdentifierHash: z.string().max(64).optional(),
    status: z.string().max(20),
  });

  // List all episodes for the authenticated user
  app.get(
    "/api/episodes",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const episodes = await storage.getEpisodesByUser(req.userId!);
        res.json(episodes);
      } catch (error) {
        console.error(
          "Error listing episodes:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to list episodes" });
      }
    },
  );

  // Get a single episode by ID
  app.get(
    "/api/episodes/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const episode = await storage.getEpisode(
          req.params.id as string,
          req.userId!,
        );
        if (!episode) {
          res.status(404).json({ error: "Episode not found" });
          return;
        }
        res.json(episode);
      } catch (error) {
        console.error(
          "Error fetching episode:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to fetch episode" });
      }
    },
  );

  // Create a new episode
  app.post(
    "/api/episodes",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = episodeBodySchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid episode data",
            details: parseResult.error.issues,
          });
          return;
        }

        const { id, encryptedData, patientIdentifierHash, status } =
          parseResult.data;
        const episode = await storage.createEpisode({
          id,
          userId: req.userId!,
          encryptedData,
          patientIdentifierHash: patientIdentifierHash ?? null,
          status,
        });
        res.status(201).json(episode);
      } catch (error) {
        console.error(
          "Error creating episode:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to create episode" });
      }
    },
  );

  // Update an existing episode
  app.put(
    "/api/episodes/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const parseResult = episodeBodySchema
          .partial()
          .omit({ id: true })
          .safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid episode data",
            details: parseResult.error.issues,
          });
          return;
        }

        const updated = await storage.updateEpisode(
          req.params.id as string,
          req.userId!,
          parseResult.data,
        );
        if (!updated) {
          res.status(404).json({ error: "Episode not found" });
          return;
        }
        res.json(updated);
      } catch (error) {
        console.error(
          "Error updating episode:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to update episode" });
      }
    },
  );

  // Delete an episode
  app.delete(
    "/api/episodes/:id",
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const deleted = await storage.deleteEpisode(
          req.params.id as string,
          req.userId!,
        );
        if (!deleted) {
          res.status(404).json({ error: "Episode not found" });
          return;
        }
        res.json({ success: true });
      } catch (error) {
        console.error(
          "Error deleting episode:",
          error instanceof Error ? error.message : "Unknown error",
        );
        res.status(500).json({ error: "Failed to delete episode" });
      }
    },
  );

  const httpServer = createServer(app);

  return httpServer;
}
