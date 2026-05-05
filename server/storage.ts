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
  passwordResetTokens,
  type PasswordResetToken,
  userDeviceKeys,
  type UserDeviceKey,
  sharedCases,
  type SharedCase,
  type InsertSharedCase,
  caseKeyEnvelopes,
  type CaseKeyEnvelope,
  type InsertCaseKeyEnvelope,
  caseAssessments,
  type CaseAssessment,
  type InsertCaseAssessment,
  assessmentKeyEnvelopes,
  type AssessmentKeyEnvelope,
  type InsertAssessmentKeyEnvelope,
  pushTokens,
  type PushToken,
  teamContacts,
  type TeamContactRow,
  type InsertTeamContact,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, sql, lt, isNull, isNotNull, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAppleId(appleUserId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(
    userId: string,
    data: Partial<Pick<User, "appleUserId">>,
  ): Promise<void>;
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

  getUserDeviceKeys(userId: string): Promise<UserDeviceKey[]>;
  upsertUserDeviceKey(
    userId: string,
    deviceId: string,
    publicKey: string,
    label?: string | null,
  ): Promise<UserDeviceKey>;
  revokeUserDeviceKey(userId: string, deviceId: string): Promise<boolean>;

  // Shared cases
  createSharedCase(data: InsertSharedCase): Promise<SharedCase>;
  getSharedCaseById(id: string): Promise<SharedCase | undefined>;
  getSharedInbox(
    userId: string,
    opts: { status?: string; limit: number; offset: number },
  ): Promise<(SharedCase & { ownerDisplayName: string | null })[]>;
  getSharedOutbox(
    userId: string,
  ): Promise<(SharedCase & { recipientDisplayName: string | null })[]>;
  updateSharedCaseVerification(
    id: string,
    recipientUserId: string,
    status: string,
    note?: string,
  ): Promise<SharedCase | undefined>;
  updateSharedCaseBlob(
    id: string,
    ownerUserId: string,
    blob: string,
    version: number,
  ): Promise<SharedCase | undefined>;
  deleteSharedCase(id: string, ownerUserId: string): Promise<boolean>;

  // Case key envelopes
  createCaseKeyEnvelopes(
    envelopes: InsertCaseKeyEnvelope[],
  ): Promise<CaseKeyEnvelope[]>;
  getCaseKeyEnvelopes(
    sharedCaseId: string,
    recipientUserId: string,
  ): Promise<CaseKeyEnvelope[]>;

  // Case assessments
  createCaseAssessment(data: InsertCaseAssessment): Promise<CaseAssessment>;
  getCaseAssessments(sharedCaseId: string): Promise<CaseAssessment[]>;
  revealAssessments(sharedCaseId: string): Promise<void>;

  // Assessment key envelopes
  createAssessmentKeyEnvelopes(
    envelopes: InsertAssessmentKeyEnvelope[],
  ): Promise<AssessmentKeyEnvelope[]>;
  getAssessmentKeyEnvelopes(
    assessmentId: string,
    recipientUserId: string,
    releasedOnly: boolean,
  ): Promise<AssessmentKeyEnvelope[]>;
  releaseAssessmentKeyEnvelopes(sharedCaseId: string): Promise<void>;

  // Assessment history
  getRevealedAssessments(
    userId: string,
    opts: { role?: string; limit: number; offset: number },
  ): Promise<
    Pick<
      CaseAssessment,
      "id" | "sharedCaseId" | "assessorRole" | "submittedAt" | "revealedAt"
    >[]
  >;

  // Push tokens
  upsertPushToken(
    userId: string,
    token: string,
    deviceId: string,
    platform?: string,
  ): Promise<PushToken>;
  deletePushToken(userId: string, deviceId: string): Promise<boolean>;
  getPushTokensForUser(userId: string): Promise<PushToken[]>;

  // Team contacts
  getTeamContacts(ownerUserId: string): Promise<TeamContactRow[]>;
  getTeamContact(
    id: string,
    ownerUserId: string,
  ): Promise<TeamContactRow | undefined>;
  createTeamContact(data: InsertTeamContact): Promise<TeamContactRow>;
  updateTeamContact(
    id: string,
    ownerUserId: string,
    data: Partial<InsertTeamContact>,
  ): Promise<TeamContactRow | undefined>;
  deleteTeamContact(id: string, ownerUserId: string): Promise<boolean>;
  linkTeamContact(
    id: string,
    ownerUserId: string,
    linkedUserId: string,
  ): Promise<TeamContactRow | undefined>;
  unlinkTeamContact(
    id: string,
    ownerUserId: string,
  ): Promise<TeamContactRow | undefined>;

  // Discovery helpers
  getUserByPhone(phone: string): Promise<User | undefined>;

  // Invitations
  recordInvitation(
    contactId: string,
    ownerUserId: string,
    email: string,
  ): Promise<TeamContactRow | undefined>;

  /** Mark team_contacts rows as accepted when a new user signs up with a matching email. */
  matchInvitationsByEmail(email: string): Promise<number>;

  // Sharing authorization helpers
  isSharedCaseOwner(userId: string, sharedCaseId: string): Promise<boolean>;
  isSharedCaseRecipient(userId: string, sharedCaseId: string): Promise<boolean>;
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

  async getUserByAppleId(appleUserId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.appleUserId, appleUserId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user!;
  }

  async updateUser(
    userId: string,
    data: Partial<Pick<User, "appleUserId">>,
  ): Promise<void> {
    await db.update(users).set(data).where(eq(users.id, userId));
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
    // team_contacts, shared_cases, case_key_envelopes, and push_tokens.
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

  // ── Shared cases ────────────────────────────────────────────────────────────

  async createSharedCase(data: InsertSharedCase): Promise<SharedCase> {
    const [created] = await db.insert(sharedCases).values(data).returning();
    return created!;
  }

  async getSharedCaseById(id: string): Promise<SharedCase | undefined> {
    const [row] = await db
      .select()
      .from(sharedCases)
      .where(eq(sharedCases.id, id));
    return row || undefined;
  }

  async getSharedInbox(
    userId: string,
    opts: { status?: string; limit: number; offset: number },
  ): Promise<(SharedCase & { ownerDisplayName: string | null })[]> {
    const conditions = [eq(sharedCases.recipientUserId, userId)];
    if (opts.status) {
      conditions.push(eq(sharedCases.verificationStatus, opts.status));
    }

    const rows = await db
      .select({
        id: sharedCases.id,
        caseId: sharedCases.caseId,
        ownerUserId: sharedCases.ownerUserId,
        recipientUserId: sharedCases.recipientUserId,
        encryptedShareableBlob: sharedCases.encryptedShareableBlob,
        blobVersion: sharedCases.blobVersion,
        recipientRole: sharedCases.recipientRole,
        verificationStatus: sharedCases.verificationStatus,
        verificationNote: sharedCases.verificationNote,
        verifiedAt: sharedCases.verifiedAt,
        createdAt: sharedCases.createdAt,
        updatedAt: sharedCases.updatedAt,
        ownerDisplayName: profiles.fullName,
      })
      .from(sharedCases)
      .leftJoin(profiles, eq(profiles.userId, sharedCases.ownerUserId))
      .where(and(...conditions))
      .orderBy(desc(sharedCases.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);

    return rows;
  }

  async getSharedOutbox(
    userId: string,
  ): Promise<(SharedCase & { recipientDisplayName: string | null })[]> {
    const rows = await db
      .select({
        id: sharedCases.id,
        caseId: sharedCases.caseId,
        ownerUserId: sharedCases.ownerUserId,
        recipientUserId: sharedCases.recipientUserId,
        encryptedShareableBlob: sharedCases.encryptedShareableBlob,
        blobVersion: sharedCases.blobVersion,
        recipientRole: sharedCases.recipientRole,
        verificationStatus: sharedCases.verificationStatus,
        verificationNote: sharedCases.verificationNote,
        verifiedAt: sharedCases.verifiedAt,
        createdAt: sharedCases.createdAt,
        updatedAt: sharedCases.updatedAt,
        recipientDisplayName: profiles.fullName,
      })
      .from(sharedCases)
      .leftJoin(profiles, eq(profiles.userId, sharedCases.recipientUserId))
      .where(eq(sharedCases.ownerUserId, userId))
      .orderBy(desc(sharedCases.createdAt));

    return rows;
  }

  async updateSharedCaseVerification(
    id: string,
    recipientUserId: string,
    status: string,
    note?: string,
  ): Promise<SharedCase | undefined> {
    const [updated] = await db
      .update(sharedCases)
      .set({
        verificationStatus: status,
        verificationNote: note ?? null,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sharedCases.id, id),
          eq(sharedCases.recipientUserId, recipientUserId),
        ),
      )
      .returning();
    return updated || undefined;
  }

  async updateSharedCaseBlob(
    id: string,
    ownerUserId: string,
    blob: string,
    version: number,
  ): Promise<SharedCase | undefined> {
    // Optimistic locking: only update if new version > current version
    const [updated] = await db
      .update(sharedCases)
      .set({
        encryptedShareableBlob: blob,
        blobVersion: version,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sharedCases.id, id),
          eq(sharedCases.ownerUserId, ownerUserId),
          lt(sharedCases.blobVersion, version),
        ),
      )
      .returning();
    return updated || undefined;
  }

  async deleteSharedCase(id: string, ownerUserId: string): Promise<boolean> {
    const result = await db
      .delete(sharedCases)
      .where(
        and(eq(sharedCases.id, id), eq(sharedCases.ownerUserId, ownerUserId)),
      )
      .returning();
    return result.length > 0;
  }

  // ── Case key envelopes ──────────────────────────────────────────────────────

  async createCaseKeyEnvelopes(
    envelopes: InsertCaseKeyEnvelope[],
  ): Promise<CaseKeyEnvelope[]> {
    if (envelopes.length === 0) return [];
    return db.insert(caseKeyEnvelopes).values(envelopes).returning();
  }

  async getCaseKeyEnvelopes(
    sharedCaseId: string,
    recipientUserId: string,
  ): Promise<CaseKeyEnvelope[]> {
    return db
      .select()
      .from(caseKeyEnvelopes)
      .where(
        and(
          eq(caseKeyEnvelopes.sharedCaseId, sharedCaseId),
          eq(caseKeyEnvelopes.recipientUserId, recipientUserId),
        ),
      );
  }

  // ── Case assessments ────────────────────────────────────────────────────────

  async createCaseAssessment(
    data: InsertCaseAssessment,
  ): Promise<CaseAssessment> {
    const [created] = await db.insert(caseAssessments).values(data).returning();
    return created!;
  }

  async getCaseAssessments(sharedCaseId: string): Promise<CaseAssessment[]> {
    return db
      .select()
      .from(caseAssessments)
      .where(eq(caseAssessments.sharedCaseId, sharedCaseId));
  }

  async revealAssessments(sharedCaseId: string): Promise<void> {
    await db
      .update(caseAssessments)
      .set({ revealedAt: new Date() })
      .where(
        and(
          eq(caseAssessments.sharedCaseId, sharedCaseId),
          isNull(caseAssessments.revealedAt),
        ),
      );
  }

  // ── Assessment key envelopes ────────────────────────────────────────────────

  async createAssessmentKeyEnvelopes(
    envelopes: InsertAssessmentKeyEnvelope[],
  ): Promise<AssessmentKeyEnvelope[]> {
    if (envelopes.length === 0) return [];
    return db.insert(assessmentKeyEnvelopes).values(envelopes).returning();
  }

  async getAssessmentKeyEnvelopes(
    assessmentId: string,
    recipientUserId: string,
    releasedOnly: boolean,
  ): Promise<AssessmentKeyEnvelope[]> {
    const conditions = [
      eq(assessmentKeyEnvelopes.caseAssessmentId, assessmentId),
      eq(assessmentKeyEnvelopes.recipientUserId, recipientUserId),
    ];
    if (releasedOnly) {
      conditions.push(eq(assessmentKeyEnvelopes.released, true));
    }
    return db
      .select()
      .from(assessmentKeyEnvelopes)
      .where(and(...conditions));
  }

  async releaseAssessmentKeyEnvelopes(sharedCaseId: string): Promise<void> {
    // Get all assessment IDs for this shared case
    const assessments = await db
      .select({ id: caseAssessments.id })
      .from(caseAssessments)
      .where(eq(caseAssessments.sharedCaseId, sharedCaseId));

    const assessmentIds = assessments.map((a) => a.id);
    if (assessmentIds.length === 0) return;

    // Release all envelopes for these assessments
    for (const assessmentId of assessmentIds) {
      await db
        .update(assessmentKeyEnvelopes)
        .set({ released: true })
        .where(eq(assessmentKeyEnvelopes.caseAssessmentId, assessmentId));
    }
  }

  // ── Assessment history ───────────────────────────────────────────────────────

  async getRevealedAssessments(
    userId: string,
    opts: { role?: string; limit: number; offset: number },
  ): Promise<
    Pick<
      CaseAssessment,
      "id" | "sharedCaseId" | "assessorRole" | "submittedAt" | "revealedAt"
    >[]
  > {
    const conditions = [
      eq(caseAssessments.assessorUserId, userId),
      isNotNull(caseAssessments.revealedAt),
    ];
    if (opts.role) {
      conditions.push(eq(caseAssessments.assessorRole, opts.role));
    }

    return db
      .select({
        id: caseAssessments.id,
        sharedCaseId: caseAssessments.sharedCaseId,
        assessorRole: caseAssessments.assessorRole,
        submittedAt: caseAssessments.submittedAt,
        revealedAt: caseAssessments.revealedAt,
      })
      .from(caseAssessments)
      .where(and(...conditions))
      .orderBy(desc(caseAssessments.submittedAt))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  // ── Push tokens ─────────────────────────────────────────────────────────────

  async upsertPushToken(
    userId: string,
    token: string,
    deviceId: string,
    platform?: string,
  ): Promise<PushToken> {
    const [existing] = await db
      .select()
      .from(pushTokens)
      .where(
        and(eq(pushTokens.userId, userId), eq(pushTokens.deviceId, deviceId)),
      );

    if (existing) {
      const [updated] = await db
        .update(pushTokens)
        .set({
          expoPushToken: token,
          platform: platform ?? existing.platform,
          updatedAt: new Date(),
        })
        .where(eq(pushTokens.id, existing.id))
        .returning();
      return updated!;
    }

    const [created] = await db
      .insert(pushTokens)
      .values({
        userId,
        expoPushToken: token,
        deviceId,
        platform: platform ?? "ios",
      })
      .returning();
    return created!;
  }

  async deletePushToken(userId: string, deviceId: string): Promise<boolean> {
    const result = await db
      .delete(pushTokens)
      .where(
        and(eq(pushTokens.userId, userId), eq(pushTokens.deviceId, deviceId)),
      )
      .returning();
    return result.length > 0;
  }

  async getPushTokensForUser(userId: string): Promise<PushToken[]> {
    return db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Team Contacts
  // ──────────────────────────────────────────────────────────────────────────

  async getTeamContacts(ownerUserId: string): Promise<TeamContactRow[]> {
    return db
      .select()
      .from(teamContacts)
      .where(eq(teamContacts.ownerUserId, ownerUserId));
  }

  async getTeamContact(
    id: string,
    ownerUserId: string,
  ): Promise<TeamContactRow | undefined> {
    const [contact] = await db
      .select()
      .from(teamContacts)
      .where(
        and(eq(teamContacts.id, id), eq(teamContacts.ownerUserId, ownerUserId)),
      );
    return contact || undefined;
  }

  async createTeamContact(data: InsertTeamContact): Promise<TeamContactRow> {
    const [created] = await db.insert(teamContacts).values(data).returning();
    return created!;
  }

  async updateTeamContact(
    id: string,
    ownerUserId: string,
    data: Partial<InsertTeamContact>,
  ): Promise<TeamContactRow | undefined> {
    const [updated] = await db
      .update(teamContacts)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(teamContacts.id, id), eq(teamContacts.ownerUserId, ownerUserId)),
      )
      .returning();
    return updated || undefined;
  }

  async deleteTeamContact(id: string, ownerUserId: string): Promise<boolean> {
    const result = await db
      .delete(teamContacts)
      .where(
        and(eq(teamContacts.id, id), eq(teamContacts.ownerUserId, ownerUserId)),
      )
      .returning();
    return result.length > 0;
  }

  async linkTeamContact(
    id: string,
    ownerUserId: string,
    linkedUserId: string,
  ): Promise<TeamContactRow | undefined> {
    const [updated] = await db
      .update(teamContacts)
      .set({
        linkedUserId,
        linkConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(teamContacts.id, id), eq(teamContacts.ownerUserId, ownerUserId)),
      )
      .returning();
    return updated || undefined;
  }

  async unlinkTeamContact(
    id: string,
    ownerUserId: string,
  ): Promise<TeamContactRow | undefined> {
    const [updated] = await db
      .update(teamContacts)
      .set({
        linkedUserId: null,
        linkConfirmedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(teamContacts.id, id), eq(teamContacts.ownerUserId, ownerUserId)),
      )
      .returning();
    return updated || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.phone, phone));
    if (!profile) return undefined;
    return this.getUser(profile.userId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Invitations
  // ──────────────────────────────────────────────────────────────────────────

  async recordInvitation(
    contactId: string,
    ownerUserId: string,
    email: string,
  ): Promise<TeamContactRow | undefined> {
    return this.updateTeamContact(contactId, ownerUserId, {
      email,
      invitationSentAt: new Date(),
    });
  }

  async matchInvitationsByEmail(email: string): Promise<number> {
    const result = await db
      .update(teamContacts)
      .set({ invitationAcceptedAt: new Date() })
      .where(
        and(
          eq(teamContacts.email, email),
          isNull(teamContacts.invitationAcceptedAt),
        ),
      )
      .returning();
    return result.length;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Sharing Authorization Helpers
  // ──────────────────────────────────────────────────────────────────────────

  async isSharedCaseOwner(
    userId: string,
    sharedCaseId: string,
  ): Promise<boolean> {
    const sc = await this.getSharedCaseById(sharedCaseId);
    return !!sc && sc.ownerUserId === userId;
  }

  async isSharedCaseRecipient(
    userId: string,
    sharedCaseId: string,
  ): Promise<boolean> {
    const sc = await this.getSharedCaseById(sharedCaseId);
    return !!sc && sc.recipientUserId === userId;
  }
}

export const storage = new DatabaseStorage();
