import {
  users,
  type User,
  type InsertUser,
  profiles,
  type Profile,
  type InsertProfile,
  userFacilities,
  type UserFacility,
  type InsertUserFacility,
  snomedRef,
  type SnomedRef,
  type InsertSnomedRef,
  procedures,
  type Procedure,
  type InsertProcedure,
  flaps,
  type Flap,
  type InsertFlap,
  anastomoses,
  type Anastomosis,
  type InsertAnastomosis,
  passwordResetTokens,
  type PasswordResetToken,
  userDeviceKeys,
  type UserDeviceKey,
  treatmentEpisodes,
  type TreatmentEpisodeRow,
  type InsertTreatmentEpisodeRow,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, ilike, sql, lt, isNull, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<boolean>;
  deleteUserAccount(userId: string): Promise<void>;

  createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<boolean>;
  deleteExpiredPasswordResetTokens(): Promise<void>;

  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(
    userId: string,
    profile: Partial<InsertProfile>,
  ): Promise<Profile | undefined>;

  getUserFacilities(userId: string): Promise<UserFacility[]>;
  createUserFacility(facility: InsertUserFacility): Promise<UserFacility>;
  updateUserFacility(
    id: string,
    userId: string,
    facility: Partial<InsertUserFacility>,
  ): Promise<UserFacility | undefined>;
  clearPrimaryFacilities(userId: string, excludeId: string): Promise<void>;
  // IMPROVEMENT: IDOR fix — requires userId to enforce ownership at query level
  deleteUserFacility(id: string, userId: string): Promise<boolean>;

  getSnomedRefs(
    category?: string,
    anatomicalRegion?: string,
    specialty?: string,
  ): Promise<SnomedRef[]>;
  getSnomedRefByCode(snomedCtCode: string): Promise<SnomedRef | undefined>;
  createSnomedRef(ref: InsertSnomedRef): Promise<SnomedRef>;
  bulkCreateSnomedRefs(refs: InsertSnomedRef[]): Promise<SnomedRef[]>;

  getProcedure(id: string): Promise<Procedure | undefined>;
  getProceduresByUser(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Procedure[]>;
  createProcedure(procedure: InsertProcedure): Promise<Procedure>;
  updateProcedure(
    id: string,
    procedure: Partial<InsertProcedure>,
  ): Promise<Procedure | undefined>;

  getFlap(id: string): Promise<Flap | undefined>;
  getFlapsByProcedure(procedureId: string): Promise<Flap[]>;
  createFlap(flap: InsertFlap): Promise<Flap>;
  updateFlap(id: string, flap: Partial<InsertFlap>): Promise<Flap | undefined>;
  deleteFlap(id: string): Promise<boolean>;

  getAnastomosis(id: string): Promise<Anastomosis | undefined>;
  getAnastomosesByFlap(flapId: string): Promise<Anastomosis[]>;
  createAnastomosis(anastomosis: InsertAnastomosis): Promise<Anastomosis>;
  updateAnastomosis(
    id: string,
    anastomosis: Partial<InsertAnastomosis>,
  ): Promise<Anastomosis | undefined>;
  deleteAnastomosis(id: string): Promise<boolean>;

  getEpisodesByUser(userId: string): Promise<TreatmentEpisodeRow[]>;
  getEpisode(
    id: string,
    userId: string,
  ): Promise<TreatmentEpisodeRow | undefined>;
  createEpisode(
    episode: InsertTreatmentEpisodeRow & { id: string },
  ): Promise<TreatmentEpisodeRow>;
  updateEpisode(
    id: string,
    userId: string,
    data: Partial<InsertTreatmentEpisodeRow>,
  ): Promise<TreatmentEpisodeRow | undefined>;
  deleteEpisode(id: string, userId: string): Promise<boolean>;

  getUserDeviceKeys(userId: string): Promise<UserDeviceKey[]>;
  upsertUserDeviceKey(
    userId: string,
    deviceId: string,
    publicKey: string,
    label?: string | null,
  ): Promise<UserDeviceKey>;
  revokeUserDeviceKey(userId: string, deviceId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user!;
  }

  async updateUserPassword(
    userId: string,
    hashedPassword: string,
  ): Promise<boolean> {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        tokenVersion: sql`${users.tokenVersion} + 1`,
      })
      .where(eq(users.id, userId));
    return true;
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // With cascades configured, deleting the user row removes all related data:
    // profiles, user_facilities, user_device_keys, password_reset_tokens,
    // team_members, procedures (-> flaps -> anastomoses, case_procedures), teams
    await db.delete(users).where(eq(users.id, userId));
  }

  async createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken> {
    const [created] = await db
      .insert(passwordResetTokens)
      .values({
        userId,
        token,
        expiresAt,
      })
      .returning();
    return created!;
  }

  async getPasswordResetToken(
    token: string,
  ): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken || undefined;
  }

  async markPasswordResetTokenUsed(id: string): Promise<boolean> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, id));
    return true;
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));
    return profile || undefined;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [created] = await db.insert(profiles).values(profile).returning();
    return created!;
  }

  async updateProfile(
    userId: string,
    profile: Partial<InsertProfile>,
  ): Promise<Profile | undefined> {
    const [updated] = await db
      .update(profiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();
    return updated || undefined;
  }

  async getUserFacilities(userId: string): Promise<UserFacility[]> {
    return db
      .select()
      .from(userFacilities)
      .where(eq(userFacilities.userId, userId));
  }

  async createUserFacility(
    facility: InsertUserFacility,
  ): Promise<UserFacility> {
    const [created] = await db
      .insert(userFacilities)
      .values(facility)
      .returning();
    return created!;
  }

  async updateUserFacility(
    id: string,
    userId: string,
    facility: Partial<InsertUserFacility>,
  ): Promise<UserFacility | undefined> {
    const [updated] = await db
      .update(userFacilities)
      .set(facility)
      .where(and(eq(userFacilities.id, id), eq(userFacilities.userId, userId)))
      .returning();
    return updated || undefined;
  }

  // Batch unset isPrimary for all user facilities except the one being set as primary
  async clearPrimaryFacilities(
    userId: string,
    excludeId: string,
  ): Promise<void> {
    await db
      .update(userFacilities)
      .set({ isPrimary: false })
      .where(
        and(
          eq(userFacilities.userId, userId),
          eq(userFacilities.isPrimary, true),
          ne(userFacilities.id, excludeId),
        ),
      );
  }

  // IMPROVEMENT: IDOR fix — deletes only if BOTH id and userId match,
  // preventing any user from deleting another user's facility by guessing the id.
  async deleteUserFacility(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(userFacilities)
      .where(and(eq(userFacilities.id, id), eq(userFacilities.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getSnomedRefs(
    category?: string,
    anatomicalRegion?: string,
    specialty?: string,
  ): Promise<SnomedRef[]> {
    const conditions = [eq(snomedRef.isActive, true)];

    if (category) {
      conditions.push(eq(snomedRef.category, category));
    }
    if (anatomicalRegion) {
      conditions.push(eq(snomedRef.anatomicalRegion, anatomicalRegion));
    }
    if (specialty) {
      conditions.push(eq(snomedRef.specialty, specialty));
    }

    const result = await db
      .select()
      .from(snomedRef)
      .where(and(...conditions))
      .orderBy(snomedRef.sortOrder, snomedRef.displayName);

    return result;
  }

  async getSnomedRefByCode(
    snomedCtCode: string,
  ): Promise<SnomedRef | undefined> {
    const [ref] = await db
      .select()
      .from(snomedRef)
      .where(eq(snomedRef.snomedCtCode, snomedCtCode));
    return ref || undefined;
  }

  async createSnomedRef(ref: InsertSnomedRef): Promise<SnomedRef> {
    const [created] = await db.insert(snomedRef).values(ref).returning();
    return created!;
  }

  async bulkCreateSnomedRefs(refs: InsertSnomedRef[]): Promise<SnomedRef[]> {
    if (refs.length === 0) return [];
    const created = await db.insert(snomedRef).values(refs).returning();
    return created;
  }

  async getProcedure(id: string): Promise<Procedure | undefined> {
    const [procedure] = await db
      .select()
      .from(procedures)
      .where(eq(procedures.id, id));
    return procedure || undefined;
  }

  async getProceduresByUser(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Procedure[]> {
    return db
      .select()
      .from(procedures)
      .where(eq(procedures.userId, userId))
      .orderBy(desc(procedures.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createProcedure(procedure: InsertProcedure): Promise<Procedure> {
    const [created] = await db.insert(procedures).values(procedure).returning();
    return created!;
  }

  async updateProcedure(
    id: string,
    procedure: Partial<InsertProcedure>,
  ): Promise<Procedure | undefined> {
    const [updated] = await db
      .update(procedures)
      .set({ ...procedure, updatedAt: new Date() })
      .where(eq(procedures.id, id))
      .returning();
    return updated || undefined;
  }

  async getFlap(id: string): Promise<Flap | undefined> {
    const [flap] = await db.select().from(flaps).where(eq(flaps.id, id));
    return flap || undefined;
  }

  async getFlapsByProcedure(procedureId: string): Promise<Flap[]> {
    return db.select().from(flaps).where(eq(flaps.procedureId, procedureId));
  }

  async createFlap(flap: InsertFlap): Promise<Flap> {
    const [created] = await db.insert(flaps).values(flap).returning();
    return created!;
  }

  async updateFlap(
    id: string,
    flap: Partial<InsertFlap>,
  ): Promise<Flap | undefined> {
    const [updated] = await db
      .update(flaps)
      .set(flap)
      .where(eq(flaps.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFlap(id: string): Promise<boolean> {
    await db.delete(flaps).where(eq(flaps.id, id));
    return true;
  }

  async getAnastomosis(id: string): Promise<Anastomosis | undefined> {
    const [anastomosis] = await db
      .select()
      .from(anastomoses)
      .where(eq(anastomoses.id, id));
    return anastomosis || undefined;
  }

  async getAnastomosesByFlap(flapId: string): Promise<Anastomosis[]> {
    return db.select().from(anastomoses).where(eq(anastomoses.flapId, flapId));
  }

  async createAnastomosis(
    anastomosis: InsertAnastomosis,
  ): Promise<Anastomosis> {
    const [created] = await db
      .insert(anastomoses)
      .values(anastomosis)
      .returning();
    return created!;
  }

  async updateAnastomosis(
    id: string,
    anastomosis: Partial<InsertAnastomosis>,
  ): Promise<Anastomosis | undefined> {
    const [updated] = await db
      .update(anastomoses)
      .set(anastomosis)
      .where(eq(anastomoses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAnastomosis(id: string): Promise<boolean> {
    await db.delete(anastomoses).where(eq(anastomoses.id, id));
    return true;
  }

  // Ownership verification helpers — single query each (no N+1 chains)
  async verifyProcedureOwnership(
    procedureId: string,
    userId: string,
  ): Promise<boolean> {
    const [result] = await db
      .select({ id: procedures.id })
      .from(procedures)
      .where(
        and(eq(procedures.id, procedureId), eq(procedures.userId, userId)),
      );
    return !!result;
  }

  async verifyFlapOwnership(flapId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .select({ id: flaps.id })
      .from(flaps)
      .innerJoin(procedures, eq(flaps.procedureId, procedures.id))
      .where(and(eq(flaps.id, flapId), eq(procedures.userId, userId)));
    return !!result;
  }

  async verifyAnastomosisOwnership(
    anastomosisId: string,
    userId: string,
  ): Promise<boolean> {
    const [result] = await db
      .select({ id: anastomoses.id })
      .from(anastomoses)
      .innerJoin(flaps, eq(anastomoses.flapId, flaps.id))
      .innerJoin(procedures, eq(flaps.procedureId, procedures.id))
      .where(
        and(eq(anastomoses.id, anastomosisId), eq(procedures.userId, userId)),
      );
    return !!result;
  }

  // ── Treatment Episodes ────────────────────────────────────────────────────

  async getEpisodesByUser(userId: string): Promise<TreatmentEpisodeRow[]> {
    return db
      .select()
      .from(treatmentEpisodes)
      .where(eq(treatmentEpisodes.userId, userId))
      .orderBy(desc(treatmentEpisodes.updatedAt));
  }

  async getEpisode(
    id: string,
    userId: string,
  ): Promise<TreatmentEpisodeRow | undefined> {
    const [episode] = await db
      .select()
      .from(treatmentEpisodes)
      .where(
        and(
          eq(treatmentEpisodes.id, id),
          eq(treatmentEpisodes.userId, userId),
        ),
      );
    return episode || undefined;
  }

  async createEpisode(
    episode: InsertTreatmentEpisodeRow & { id: string },
  ): Promise<TreatmentEpisodeRow> {
    const [created] = await db
      .insert(treatmentEpisodes)
      .values(episode)
      .returning();
    return created!;
  }

  async updateEpisode(
    id: string,
    userId: string,
    data: Partial<InsertTreatmentEpisodeRow>,
  ): Promise<TreatmentEpisodeRow | undefined> {
    const [updated] = await db
      .update(treatmentEpisodes)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(treatmentEpisodes.id, id),
          eq(treatmentEpisodes.userId, userId),
        ),
      )
      .returning();
    return updated || undefined;
  }

  async deleteEpisode(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(treatmentEpisodes)
      .where(
        and(
          eq(treatmentEpisodes.id, id),
          eq(treatmentEpisodes.userId, userId),
        ),
      )
      .returning();
    return result.length > 0;
  }

  async getUserDeviceKeys(userId: string): Promise<UserDeviceKey[]> {
    return db
      .select()
      .from(userDeviceKeys)
      .where(
        and(
          eq(userDeviceKeys.userId, userId),
          isNull(userDeviceKeys.revokedAt),
        ),
      );
  }

  async upsertUserDeviceKey(
    userId: string,
    deviceId: string,
    publicKey: string,
    label?: string | null,
  ): Promise<UserDeviceKey> {
    const [existing] = await db
      .select()
      .from(userDeviceKeys)
      .where(
        and(
          eq(userDeviceKeys.userId, userId),
          eq(userDeviceKeys.deviceId, deviceId),
        ),
      );

    if (existing) {
      const [updated] = await db
        .update(userDeviceKeys)
        .set({
          publicKey,
          label: label ?? existing.label ?? null,
          lastSeenAt: new Date(),
          revokedAt: null,
        })
        .where(eq(userDeviceKeys.id, existing.id))
        .returning();
      return updated!;
    }

    const [created] = await db
      .insert(userDeviceKeys)
      .values({ userId, deviceId, publicKey, label: label ?? null })
      .returning();
    return created!;
  }

  async revokeUserDeviceKey(
    userId: string,
    deviceId: string,
  ): Promise<boolean> {
    await db
      .update(userDeviceKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(userDeviceKeys.userId, userId),
          eq(userDeviceKeys.deviceId, deviceId),
        ),
      );
    return true;
  }
}

export const storage = new DatabaseStorage();
