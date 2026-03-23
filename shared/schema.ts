import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  serial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { ProfessionalRegistrations } from "./professionalRegistrations";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  appleUserId: text("apple_user_id"),
  tokenVersion: integer("token_version").default(0).notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  appleUserId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const userDeviceKeys = pgTable(
  "user_device_keys",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    publicKey: text("public_key").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    lastSeenAt: timestamp("last_seen_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => [
    uniqueIndex("user_device_keys_user_device_idx").on(t.userId, t.deviceId),
  ],
);

export const insertUserDeviceKeySchema = createInsertSchema(
  userDeviceKeys,
).omit({
  id: true,
  createdAt: true,
  lastSeenAt: true,
  revokedAt: true,
});

export type UserDeviceKey = typeof userDeviceKeys.$inferSelect;
export type InsertUserDeviceKey = z.infer<typeof insertUserDeviceKeySchema>;

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").default(false).notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [index("password_reset_tokens_user_idx").on(t.userId)],
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const countryOfPracticeEnum = [
  "new_zealand",
  "australia",
  "poland",
  "united_kingdom",
  "united_states",
  "other",
] as const;
export type CountryOfPractice = (typeof countryOfPracticeEnum)[number];

export const careerStageEnum = [
  "junior_house_officer",
  "registrar_non_training",
  "set_trainee",
  "fellow",
  "consultant_specialist",
  "moss",
] as const;
export type CareerStage = (typeof careerStageEnum)[number];

export const verificationStatusEnum = [
  "unverified",
  "pending",
  "verified",
] as const;
export type VerificationStatus = (typeof verificationStatusEnum)[number];

export const sexEnum = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
] as const;
export type Sex = (typeof sexEnum)[number];

export const profiles = pgTable("profiles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  fullName: text("full_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  dateOfBirth: varchar("date_of_birth", { length: 10 }), // ISO date string YYYY-MM-DD
  sex: varchar("sex", { length: 20 }),
  profilePictureUrl: text("profile_picture_url"),
  countryOfPractice: varchar("country_of_practice", { length: 50 }),
  medicalCouncilNumber: varchar("medical_council_number", { length: 50 }),
  professionalRegistrations: jsonb("professional_registrations")
    .$type<ProfessionalRegistrations>()
    .default(sql`'{}'::jsonb`),
  verificationStatus: varchar("verification_status", { length: 20 })
    .default("unverified")
    .notNull(),
  careerStage: varchar("career_stage", { length: 50 }),
  surgicalPreferences: jsonb("surgical_preferences")
    .$type<Record<string, unknown>>()
    .default(sql`'{}'::jsonb`),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  facilities: many(userFacilities),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export const userFacilities = pgTable(
  "user_facilities",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    facilityName: text("facility_name").notNull(),
    facilityId: text("facility_id"), // Reference to master facility list (optional for backwards compatibility)
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [index("user_facilities_user_idx").on(t.userId)],
);

export const userFacilitiesRelations = relations(userFacilities, ({ one }) => ({
  user: one(users, {
    fields: [userFacilities.userId],
    references: [users.id],
  }),
}));

export const insertUserFacilitySchema = createInsertSchema(userFacilities).omit(
  {
    id: true,
    createdAt: true,
  },
);

export type UserFacility = typeof userFacilities.$inferSelect;
export type InsertUserFacility = z.infer<typeof insertUserFacilitySchema>;

export const teams = pgTable(
  "teams",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: varchar("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [index("teams_owner_idx").on(t.ownerId)],
);

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
}));

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export const teamMemberRoleEnum = [
  "owner",
  "admin",
  "member",
  "viewer",
] as const;
export type TeamMemberRole = (typeof teamMemberRoleEnum)[number];

export const teamMembers = pgTable(
  "team_members",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).default("member").notNull(),
    joinedAt: timestamp("joined_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("team_members_team_idx").on(t.teamId),
    index("team_members_user_idx").on(t.userId),
  ],
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export const snomedRef = pgTable(
  "snomed_ref",
  {
    id: serial("id").primaryKey(),
    snomedCtCode: varchar("snomed_ct_code", { length: 50 }).notNull(),
    displayName: text("display_name").notNull(),
    commonName: text("common_name"),
    category: varchar("category", { length: 50 }).notNull(),
    subcategory: varchar("subcategory", { length: 50 }),
    anatomicalRegion: varchar("anatomical_region", { length: 100 }),
    specialty: varchar("specialty", { length: 50 }),
    codeType: varchar("code_type", { length: 20 }).default("sctid").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("snomed_ref_category_idx").on(t.category),
    index("snomed_ref_code_idx").on(t.snomedCtCode),
  ],
);

export const insertSnomedRefSchema = createInsertSchema(snomedRef).omit({
  id: true,
  createdAt: true,
});

export type SnomedRef = typeof snomedRef.$inferSelect;
export type InsertSnomedRef = z.infer<typeof insertSnomedRefSchema>;

// ── Team Sharing Tables ─────────────────────────────────────────────────────

export const sharedCases = pgTable(
  "shared_cases",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    caseId: varchar("case_id").notNull(),
    ownerUserId: varchar("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientUserId: varchar("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedShareableBlob: text("encrypted_shareable_blob").notNull(),
    blobVersion: integer("blob_version").notNull().default(1),
    recipientRole: varchar("recipient_role", { length: 30 }).notNull(),
    verificationStatus: varchar("verification_status", { length: 20 })
      .notNull()
      .default("pending"),
    verificationNote: text("verification_note"),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("shared_cases_owner_idx").on(t.ownerUserId),
    index("shared_cases_recipient_idx").on(t.recipientUserId),
    index("shared_cases_case_idx").on(t.caseId),
    uniqueIndex("shared_cases_case_recipient_idx").on(
      t.caseId,
      t.recipientUserId,
    ),
  ],
);

export const insertSharedCaseSchema = createInsertSchema(sharedCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
});

export type SharedCase = typeof sharedCases.$inferSelect;
export type InsertSharedCase = z.infer<typeof insertSharedCaseSchema>;

export const caseKeyEnvelopes = pgTable(
  "case_key_envelopes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sharedCaseId: varchar("shared_case_id")
      .notNull()
      .references(() => sharedCases.id, { onDelete: "cascade" }),
    recipientUserId: varchar("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientDeviceId: varchar("recipient_device_id").notNull(),
    envelopeJson: text("envelope_json").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("case_key_envelopes_recipient_device_idx").on(
      t.recipientUserId,
      t.recipientDeviceId,
    ),
  ],
);

export const insertCaseKeyEnvelopeSchema = createInsertSchema(
  caseKeyEnvelopes,
).omit({
  id: true,
  createdAt: true,
});

export type CaseKeyEnvelope = typeof caseKeyEnvelopes.$inferSelect;
export type InsertCaseKeyEnvelope = z.infer<typeof insertCaseKeyEnvelopeSchema>;

export const caseAssessments = pgTable(
  "case_assessments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sharedCaseId: varchar("shared_case_id")
      .notNull()
      .references(() => sharedCases.id, { onDelete: "cascade" }),
    assessorUserId: varchar("assessor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assessorRole: varchar("assessor_role", { length: 20 }).notNull(),
    encryptedAssessment: text("encrypted_assessment").notNull(),
    submittedAt: timestamp("submitted_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    revealedAt: timestamp("revealed_at"),
  },
  (t) => [
    index("case_assessments_shared_case_idx").on(t.sharedCaseId),
    uniqueIndex("case_assessments_case_role_idx").on(
      t.sharedCaseId,
      t.assessorRole,
    ),
  ],
);

export const insertCaseAssessmentSchema = createInsertSchema(
  caseAssessments,
).omit({
  id: true,
  submittedAt: true,
  revealedAt: true,
});

export type CaseAssessment = typeof caseAssessments.$inferSelect;
export type InsertCaseAssessment = z.infer<typeof insertCaseAssessmentSchema>;

export const assessmentKeyEnvelopes = pgTable(
  "assessment_key_envelopes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    caseAssessmentId: varchar("case_assessment_id")
      .notNull()
      .references(() => caseAssessments.id, { onDelete: "cascade" }),
    recipientUserId: varchar("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientDeviceId: varchar("recipient_device_id").notNull(),
    envelopeJson: text("envelope_json").notNull(),
    released: boolean("released").notNull().default(false),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("assessment_key_envelopes_recipient_released_idx").on(
      t.recipientUserId,
      t.released,
    ),
  ],
);

export const insertAssessmentKeyEnvelopeSchema = createInsertSchema(
  assessmentKeyEnvelopes,
).omit({
  id: true,
  createdAt: true,
});

export type AssessmentKeyEnvelope =
  typeof assessmentKeyEnvelopes.$inferSelect;
export type InsertAssessmentKeyEnvelope = z.infer<
  typeof insertAssessmentKeyEnvelopeSchema
>;

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expoPushToken: varchar("expo_push_token").notNull(),
    deviceId: varchar("device_id").notNull(),
    platform: varchar("platform", { length: 10 }).notNull().default("ios"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("push_tokens_user_idx").on(t.userId),
    uniqueIndex("push_tokens_user_device_idx").on(t.userId, t.deviceId),
  ],
);

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
