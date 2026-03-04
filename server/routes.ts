import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { storage } from "./storage";
import { allSeedData } from "./seedData";
import { searchProcedures, searchDiagnoses, getConceptDetails } from "./snomedApi";
import { getStagingForDiagnosis, getAllStagingConfigs } from "./diagnosisStagingConfig";
import { sendPasswordResetEmail } from "./email";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertProfileSchema, insertFlapSchema, insertAnastomosisSchema, insertUserFacilitySchema } from "@shared/schema";
import { env } from "./env";
import { z } from "zod";

// ── Auth validation schemas ──────────────────────────────────────────────────

const signupSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required").max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});

// ── Profile validation schemas ───────────────────────────────────────────────

const profileUpdateSchema = insertProfileSchema
  .pick({
    fullName: true,
    countryOfPractice: true,
    medicalCouncilNumber: true,
    careerStage: true,
    onboardingComplete: true,
  })
  .partial();

// ── Facility validation schemas ──────────────────────────────────────────────

const facilityCreateSchema = insertUserFacilitySchema.pick({
  facilityName: true,
  facilityId: true,
  isPrimary: true,
}).required({ facilityName: true }).extend({
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

// ── Flap/Anastomosis validation schemas ──────────────────────────────────────

const flapCreateSchema = insertFlapSchema;
const flapUpdateSchema = insertFlapSchema.partial().omit({ procedureId: true });
const anastomosisCreateSchema = insertAnastomosisSchema;
const anastomosisUpdateSchema = insertAnastomosisSchema.partial().omit({ flapId: true });

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

const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string; tokenVersion?: number };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const currentTokenVersion = user.tokenVersion ?? 0;
    if ((decoded.tokenVersion ?? 0) !== currentTokenVersion) {
      return res.status(401).json({ error: "Token has been revoked" });
    }
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
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
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkAuthRateLimit(clientIp)) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }

      const parseResult = signupSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
      }
      const { email, password } = parseResult.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ email, password: hashedPassword });
      
      await storage.createProfile({ userId: user.id, onboardingComplete: false });
      
      const token = jwt.sign(
        { userId: user.id, tokenVersion: user.tokenVersion ?? 0 },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: "30d" }
      );

      res.json({ token, user: { id: user.id, email: user.email } });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkAuthRateLimit(clientIp)) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }

      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
      }
      const { email, password } = parseResult.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const profile = await storage.getProfile(user.id);
      const facilities = await storage.getUserFacilities(user.id);
      const token = jwt.sign(
        { userId: user.id, tokenVersion: user.tokenVersion ?? 0 },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: "30d" }
      );

      res.json({
        token,
        user: { id: user.id, email: user.email },
        profile,
        facilities,
        onboardingComplete: profile?.onboardingComplete ?? false
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const profile = await storage.getProfile(user.id);
      const facilities = await storage.getUserFacilities(user.id);
      
      res.json({
        user: { id: user.id, email: user.email },
        profile,
        facilities,
        onboardingComplete: profile?.onboardingComplete ?? false
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Failed to check authentication" });
    }
  });

  app.post("/api/auth/change-password", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = changePasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
      }
      const { currentPassword, newPassword } = parseResult.data;

      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(req.userId!, hashedPassword);

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.post("/api/auth/request-password-reset", async (req: Request, res: Response) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkAuthRateLimit(clientIp)) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }

      const parseResult = requestPasswordResetSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
      }
      const { email } = parseResult.data;

      const user = await storage.getUserByEmail(email);
      
      // Always return success for security (don't reveal if email exists)
      if (!user) {
        return res.json({ success: true, message: "If an account exists, reset instructions will be sent" });
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
        console.error("Failed to send password reset email:", emailResult.error);
      }

      res.json({ success: true, message: "If an account exists, reset instructions will be sent" });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const parseResult = resetPasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
      }
      const { token, newPassword } = parseResult.data;

      // Hash the incoming token to match against stored hash
      const resetToken = await storage.getPasswordResetToken(hashResetToken(token));
      
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (resetToken.used) {
        return res.status(400).json({ error: "This reset token has already been used" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      await storage.markPasswordResetTokenUsed(resetToken.id);

      res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Profile Routes
  // Consumer: Mobile client (onboarding, settings)
  // Ownership: Implicit — always scoped to authenticated user
  // ──────────────────────────────────────────────────────────────────────────
  app.get("/api/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const profile = await storage.getProfile(req.userId!);
      res.json(profile || null);
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = profileUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid profile data", details: parseResult.error.flatten() });
      }
      
      const profile = await storage.updateProfile(req.userId!, parseResult.data);
      res.json(profile);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Facilities Routes
  // Consumer: Mobile client (onboarding, settings)
  // Ownership: Scoped to authenticated user via userId filter
  // ──────────────────────────────────────────────────────────────────────────
  app.get("/api/facilities", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const facilities = await storage.getUserFacilities(req.userId!);
      res.json(facilities);
    } catch (error) {
      console.error("Facilities fetch error:", error);
      res.status(500).json({ error: "Failed to fetch facilities" });
    }
  });

  app.post("/api/facilities", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = facilityCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid facility data", details: parseResult.error.flatten() });
      }

      const facility = await storage.createUserFacility({
        userId: req.userId!,
        facilityName: parseResult.data.facilityName,
        facilityId: parseResult.data.facilityId ?? null,
        isPrimary: parseResult.data.isPrimary,
      });
      res.json(facility);
    } catch (error) {
      console.error("Facility create error:", error);
      res.status(500).json({ error: "Failed to create facility" });
    }
  });

  app.put("/api/facilities/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = facilityUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid facility data", details: parseResult.error.flatten() });
      }
      const userId = req.userId!;
      const { isPrimary } = parseResult.data;

      // If setting as primary, unset all other facilities in a single query
      if (isPrimary) {
        await storage.clearPrimaryFacilities(userId, req.params.id);
      }

      const updated = await storage.updateUserFacility(req.params.id, userId, { isPrimary: isPrimary ?? false });
      if (!updated) {
        return res.status(404).json({ error: "Facility not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Facility update error:", error);
      res.status(500).json({ error: "Failed to update facility" });
    }
  });

  // IMPROVEMENT: IDOR fix — pass userId to enforce ownership at the query level
  app.delete("/api/facilities/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await storage.deleteUserFacility(req.params.id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: "Facility not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Facility delete error:", error);
      res.status(500).json({ error: "Failed to delete facility" });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Device Key Routes (E2EE scaffolding)
  // Consumer: Mobile client (planned — key registration for end-to-end encryption)
  // Status: Active — scaffolding for E2EE feature, used during device registration
  // ──────────────────────────────────────────────────────────────────────────
  app.post("/api/keys/device", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = deviceKeySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid device key data", details: parseResult.error.flatten() });
      }
      const { deviceId, publicKey, label } = parseResult.data;

      const key = await storage.upsertUserDeviceKey(
        req.userId!,
        deviceId,
        publicKey,
        label ?? null
      );

      res.json({ success: true, keyId: key.id });
    } catch (error) {
      console.error("Device key upsert error:", error);
      res.status(500).json({ error: "Failed to register device key" });
    }
  });

  // Consumer: Mobile client (planned — list registered device keys)
  // Status: Active — E2EE scaffolding
  app.get("/api/keys/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const keys = await storage.getUserDeviceKeys(req.userId!);
      res.json(keys);
    } catch (error) {
      console.error("Device key fetch error:", error);
      res.status(500).json({ error: "Failed to fetch device keys" });
    }
  });

  // Consumer: Mobile client (planned — revoke a device key)
  // Status: Active — E2EE scaffolding
  app.post("/api/keys/revoke", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = revokeDeviceKeySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request", details: parseResult.error.flatten() });
      }

      await storage.revokeUserDeviceKey(req.userId!, parseResult.data.deviceId);
      res.json({ success: true });
    } catch (error) {
      console.error("Device key revoke error:", error);
      res.status(500).json({ error: "Failed to revoke device key" });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SNOMED Reference Data API
  // Consumer: Mobile client (procedure entry — flap types, vessels, regions, etc.)
  // These endpoints serve the curated SNOMED CT reference picklists for case entry UI.
  // ──────────────────────────────────────────────────────────────────────────
  app.get("/api/snomed-ref", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { category, anatomicalRegion, specialty } = req.query;
      const refs = await storage.getSnomedRefs(
        category as string | undefined,
        anatomicalRegion as string | undefined,
        specialty as string | undefined
      );
      res.json(refs);
    } catch (error) {
      console.error("Error fetching SNOMED refs:", error);
      res.status(500).json({ error: "Failed to fetch reference data" });
    }
  });

  app.get("/api/snomed-ref/vessels/:region", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { region } = req.params;
      const { subcategory } = req.query;
      
      let refs = await storage.getSnomedRefs("vessel", region);
      
      if (subcategory) {
        refs = refs.filter(r => r.subcategory === subcategory);
      }
      
      res.json(refs);
    } catch (error) {
      console.error("Error fetching vessels:", error);
      res.status(500).json({ error: "Failed to fetch vessels" });
    }
  });

  app.get("/api/snomed-ref/regions", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refs = await storage.getSnomedRefs("anatomical_region");
      res.json(refs);
    } catch (error) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  });

  app.get("/api/snomed-ref/flap-types", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refs = await storage.getSnomedRefs("flap");
      res.json(refs);
    } catch (error) {
      console.error("Error fetching flap types:", error);
      res.status(500).json({ error: "Failed to fetch flap types" });
    }
  });

  app.get("/api/snomed-ref/donor-vessels/:flapType", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { flapType } = req.params;
      const refs = await storage.getSnomedRefs("donor_vessel", flapType);
      res.json(refs);
    } catch (error) {
      console.error("Error fetching donor vessels:", error);
      res.status(500).json({ error: "Failed to fetch donor vessels" });
    }
  });

  app.get("/api/snomed-ref/compositions", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refs = await storage.getSnomedRefs("composition");
      res.json(refs);
    } catch (error) {
      console.error("Error fetching compositions:", error);
      res.status(500).json({ error: "Failed to fetch compositions" });
    }
  });

  app.get("/api/snomed-ref/coupling-methods", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refs = await storage.getSnomedRefs("coupling_method");
      res.json(refs);
    } catch (error) {
      console.error("Error fetching coupling methods:", error);
      res.status(500).json({ error: "Failed to fetch coupling methods" });
    }
  });

  app.get("/api/snomed-ref/anastomosis-configs", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refs = await storage.getSnomedRefs("anastomosis_config");
      res.json(refs);
    } catch (error) {
      console.error("Error fetching anastomosis configs:", error);
      res.status(500).json({ error: "Failed to fetch anastomosis configs" });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Seed Data Endpoint
  // Consumer: Developer-only (run once to populate SNOMED reference data)
  // IMPROVEMENT #1: Environment-gated — disabled entirely unless ENABLE_SEED=true
  // ──────────────────────────────────────────────────────────────────────────
  if (env.ENABLE_SEED === "true") {
    app.post("/api/seed-snomed-ref", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Additional seed token protection
        const seedHeader = req.header("x-seed-token");
        const seedToken = env.SEED_TOKEN;

        if (seedToken && seedHeader !== seedToken) {
          return res.status(403).json({ error: "Forbidden" });
        }

        // Check if data already exists
        const existing = await storage.getSnomedRefs();
        if (existing.length > 0) {
          return res.json({ message: "Data already seeded", count: existing.length });
        }
        
        const created = await storage.bulkCreateSnomedRefs(allSeedData);
        res.json({ message: "Seed data created successfully", count: created.length });
      } catch (error) {
        console.error("Error seeding SNOMED refs:", error);
        res.status(500).json({ error: "Failed to seed reference data" });
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Flaps CRUD API
  // Consumer: Mobile client (free flap case entry — flap details)
  // Ownership: Verified via procedure → user ownership chain
  // ──────────────────────────────────────────────────────────────────────────
  app.get("/api/procedures/:procedureId/flaps", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { procedureId } = req.params;
      const userId = req.userId!;
      
      // Verify user owns this procedure
      const hasAccess = await storage.verifyProcedureOwnership(procedureId, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const flaps = await storage.getFlapsByProcedure(procedureId);
      res.json(flaps);
    } catch (error) {
      console.error("Error fetching flaps:", error);
      res.status(500).json({ error: "Failed to fetch flaps" });
    }
  });

  app.post("/api/flaps", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = flapCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid flap data", details: parseResult.error.flatten() });
      }
      
      const userId = req.userId!;
      const { procedureId } = parseResult.data;
      
      // Verify user owns the parent procedure
      const hasAccess = await storage.verifyProcedureOwnership(procedureId, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const flap = await storage.createFlap(parseResult.data);
      res.json(flap);
    } catch (error) {
      console.error("Error creating flap:", error);
      res.status(500).json({ error: "Failed to create flap" });
    }
  });

  app.put("/api/flaps/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = flapUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid flap data", details: parseResult.error.flatten() });
      }
      
      const { id } = req.params;
      const userId = req.userId!;
      
      // Verify user owns this flap via its procedure
      const hasAccess = await storage.verifyFlapOwnership(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const flap = await storage.updateFlap(id, parseResult.data);
      if (!flap) {
        return res.status(404).json({ error: "Flap not found" });
      }
      res.json(flap);
    } catch (error) {
      console.error("Error updating flap:", error);
      res.status(500).json({ error: "Failed to update flap" });
    }
  });

  app.delete("/api/flaps/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.userId!;
      
      // Verify user owns this flap via its procedure
      const hasAccess = await storage.verifyFlapOwnership(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteFlap(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting flap:", error);
      res.status(500).json({ error: "Failed to delete flap" });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Anastomoses CRUD API
  // Consumer: Mobile client (free flap case entry — anastomosis details)
  // Ownership: Verified via anastomosis → flap → procedure → user chain
  // ──────────────────────────────────────────────────────────────────────────
  app.get("/api/flaps/:flapId/anastomoses", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { flapId } = req.params;
      const userId = req.userId!;
      
      // Verify user owns this flap via its procedure
      const hasAccess = await storage.verifyFlapOwnership(flapId, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const anastomoses = await storage.getAnastomosesByFlap(flapId);
      res.json(anastomoses);
    } catch (error) {
      console.error("Error fetching anastomoses:", error);
      res.status(500).json({ error: "Failed to fetch anastomoses" });
    }
  });

  app.post("/api/anastomoses", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = anastomosisCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid anastomosis data", details: parseResult.error.flatten() });
      }
      
      const userId = req.userId!;
      const { flapId } = parseResult.data;
      
      // Verify user owns the parent flap
      const hasAccess = await storage.verifyFlapOwnership(flapId, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const anastomosis = await storage.createAnastomosis(parseResult.data);
      res.json(anastomosis);
    } catch (error) {
      console.error("Error creating anastomosis:", error);
      res.status(500).json({ error: "Failed to create anastomosis" });
    }
  });

  app.put("/api/anastomoses/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = anastomosisUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid anastomosis data", details: parseResult.error.flatten() });
      }
      
      const { id } = req.params;
      const userId = req.userId!;
      
      // Verify user owns this anastomosis via flap -> procedure chain
      const hasAccess = await storage.verifyAnastomosisOwnership(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const anastomosis = await storage.updateAnastomosis(id, parseResult.data);
      if (!anastomosis) {
        return res.status(404).json({ error: "Anastomosis not found" });
      }
      res.json(anastomosis);
    } catch (error) {
      console.error("Error updating anastomosis:", error);
      res.status(500).json({ error: "Failed to update anastomosis" });
    }
  });

  app.delete("/api/anastomoses/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.userId!;
      
      // Verify user owns this anastomosis via flap -> procedure chain
      const hasAccess = await storage.verifyAnastomosisOwnership(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteAnastomosis(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting anastomosis:", error);
      res.status(500).json({ error: "Failed to delete anastomosis" });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SNOMED CT Live Search API (using Ontoserver FHIR endpoint)
  // Consumer: Mobile client (procedure/diagnosis search during case entry)
  // These hit the external Ontoserver for free-text SNOMED CT lookups.
  // ──────────────────────────────────────────────────────────────────────────
  app.get("/api/snomed/procedures", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, specialty, limit } = req.query;
      
      if (!q || typeof q !== "string") {
        return res.json([]);
      }
      
      const results = await searchProcedures(
        q,
        specialty as string | undefined,
        limit ? parseInt(limit as string, 10) : 20
      );
      
      res.json(results);
    } catch (error) {
      console.error("Error searching SNOMED procedures:", error);
      res.status(500).json({ error: "Failed to search procedures" });
    }
  });

  app.get("/api/snomed/diagnoses", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, specialty, limit } = req.query;
      
      if (!q || typeof q !== "string") {
        return res.json([]);
      }
      
      const results = await searchDiagnoses(
        q,
        specialty as string | undefined,
        limit ? parseInt(limit as string, 10) : 20
      );
      
      res.json(results);
    } catch (error) {
      console.error("Error searching SNOMED diagnoses:", error);
      res.status(500).json({ error: "Failed to search diagnoses" });
    }
  });

  // Consumer: Mobile client (planned — concept detail view / cross-reference)
  // Status: Active — used for displaying full SNOMED CT concept metadata
  app.get("/api/snomed/concepts/:conceptId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { conceptId } = req.params;
      const details = await getConceptDetails(conceptId);
      
      if (!details) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      res.json(details);
    } catch (error) {
      console.error("Error fetching concept details:", error);
      res.status(500).json({ error: "Failed to fetch concept details" });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Diagnosis Staging Configuration API
  // Consumer: Mobile client (diagnosis entry — dynamic staging forms)
  // Returns staging system definitions (TNM, Clark, Breslow, etc.) for a diagnosis.
  // ──────────────────────────────────────────────────────────────────────────
  app.get("/api/staging/diagnosis", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { snomedCode, diagnosisName } = req.query;
      
      const staging = getStagingForDiagnosis(
        snomedCode as string | undefined,
        diagnosisName as string | undefined
      );
      
      res.json(staging || { stagingSystems: [] });
    } catch (error) {
      console.error("Error fetching staging config:", error);
      res.status(500).json({ error: "Failed to fetch staging configuration" });
    }
  });

  // Consumer: Mobile client (planned — staging reference browser)
  // Status: Active — returns all configured staging systems for reference
  app.get("/api/staging/all", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const configs = getAllStagingConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching all staging configs:", error);
      res.status(500).json({ error: "Failed to fetch staging configurations" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
