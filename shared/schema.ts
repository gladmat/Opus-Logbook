import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  boolean,
  integer,
  decimal,
  timestamp,
  serial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  tokenVersion: integer("token_version").default(0).notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
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
  verificationStatus: varchar("verification_status", { length: 20 })
    .default("unverified")
    .notNull(),
  careerStage: varchar("career_stage", { length: 50 }),
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

export const procedures = pgTable(
  "procedures",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    patientIdentifierHash: varchar("patient_identifier_hash", { length: 64 }),
    procedureDate: timestamp("procedure_date").notNull(),
    facility: text("facility"),
    specialty: varchar("specialty", { length: 50 }).notNull(),
    procedureSnomedCode: varchar("procedure_snomed_code", { length: 20 }),
    procedureDisplayName: text("procedure_display_name"),
    localCode: varchar("local_code", { length: 20 }),
    localCodeSystem: varchar("local_code_system", { length: 20 }),
    asaScore: varchar("asa_score", { length: 10 }),
    bmi: decimal("bmi", { precision: 5, scale: 2 }),
    smoker: varchar("smoker", { length: 20 }),
    diabetes: boolean("diabetes"),
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("procedures_user_idx").on(t.userId),
    index("procedures_user_date_idx").on(t.userId, t.createdAt),
  ],
);

export const proceduresRelations = relations(procedures, ({ one, many }) => ({
  user: one(users, {
    fields: [procedures.userId],
    references: [users.id],
  }),
  flaps: many(flaps),
}));

export const insertProcedureSchema = createInsertSchema(procedures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Procedure = typeof procedures.$inferSelect;
export type InsertProcedure = z.infer<typeof insertProcedureSchema>;

export const flaps = pgTable(
  "flaps",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    procedureId: varchar("procedure_id")
      .notNull()
      .references(() => procedures.id, { onDelete: "cascade" }),
    flapSnomedCode: varchar("flap_snomed_code", { length: 20 }),
    flapDisplayName: text("flap_display_name").notNull(),
    flapCommonName: text("flap_common_name"),
    side: varchar("side", { length: 10 }),
    composition: varchar("composition", { length: 50 }),
    harvestTechnique: varchar("harvest_technique", { length: 50 }),
    isFlowThrough: boolean("is_flow_through").default(false),
    recipientSite: varchar("recipient_site", { length: 100 }),
    recipientSiteRegion: varchar("recipient_site_region", { length: 50 }),
    indication: text("indication"),
    flapWidthCm: decimal("flap_width_cm", { precision: 5, scale: 2 }),
    flapLengthCm: decimal("flap_length_cm", { precision: 5, scale: 2 }),
    perforatorCount: integer("perforator_count"),
    elevationPlane: varchar("elevation_plane", { length: 50 }),
    ischemiaTimeMinutes: integer("ischemia_time_minutes"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [index("flaps_procedure_idx").on(t.procedureId)],
);

export const flapsRelations = relations(flaps, ({ one, many }) => ({
  procedure: one(procedures, {
    fields: [flaps.procedureId],
    references: [procedures.id],
  }),
  anastomoses: many(anastomoses),
}));

export const insertFlapSchema = createInsertSchema(flaps).omit({
  id: true,
  createdAt: true,
});

export type Flap = typeof flaps.$inferSelect;
export type InsertFlap = z.infer<typeof insertFlapSchema>;

export const anastomoses = pgTable(
  "anastomoses",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    flapId: varchar("flap_id")
      .notNull()
      .references(() => flaps.id, { onDelete: "cascade" }),
    vesselType: varchar("vessel_type", { length: 10 }).notNull(),
    recipientVesselSnomedCode: varchar("recipient_vessel_snomed_code", {
      length: 20,
    }),
    recipientVesselName: text("recipient_vessel_name").notNull(),
    donorVesselSnomedCode: varchar("donor_vessel_snomed_code", { length: 20 }),
    donorVesselName: text("donor_vessel_name"),
    couplingMethod: varchar("coupling_method", { length: 30 }),
    couplerSizeMm: decimal("coupler_size_mm", { precision: 4, scale: 2 }),
    configuration: varchar("configuration", { length: 30 }),
    sutureType: varchar("suture_type", { length: 50 }),
    sutureSize: varchar("suture_size", { length: 20 }),
    outcomeCheck: boolean("outcome_check"),
    patencyConfirmed: boolean("patency_confirmed"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [index("anastomoses_flap_idx").on(t.flapId)],
);

export const anastomosesRelations = relations(anastomoses, ({ one }) => ({
  flap: one(flaps, {
    fields: [anastomoses.flapId],
    references: [flaps.id],
  }),
}));

export const insertAnastomosisSchema = createInsertSchema(anastomoses).omit({
  id: true,
  createdAt: true,
});

export type Anastomosis = typeof anastomoses.$inferSelect;
export type InsertAnastomosis = z.infer<typeof insertAnastomosisSchema>;

export const caseProcedures = pgTable(
  "case_procedures",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    caseId: varchar("case_id")
      .notNull()
      .references(() => procedures.id, { onDelete: "cascade" }),
    sequenceOrder: integer("sequence_order").notNull().default(1),
    procedureName: text("procedure_name").notNull(),
    specialty: varchar("specialty", { length: 50 }),
    snomedCtCode: varchar("snomed_ct_code", { length: 20 }),
    snomedCtDisplay: text("snomed_ct_display"),
    localCode: varchar("local_code", { length: 20 }),
    localCodeSystem: varchar("local_code_system", { length: 20 }),
    surgeonRole: varchar("surgeon_role", { length: 20 })
      .notNull()
      .default("primary"),
    clinicalDetails: text("clinical_details"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [index("case_procedures_case_idx").on(t.caseId)],
);

export const caseProceduresRelations = relations(caseProcedures, ({ one }) => ({
  parentCase: one(procedures, {
    fields: [caseProcedures.caseId],
    references: [procedures.id],
  }),
}));

export const insertCaseProcedureSchema = createInsertSchema(
  caseProcedures,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CaseProcedure = typeof caseProcedures.$inferSelect;
export type InsertCaseProcedure = z.infer<typeof insertCaseProcedureSchema>;

// ── Treatment Episodes ──────────────────────────────────────────────────────

export const treatmentEpisodes = pgTable(
  "treatment_episodes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedData: text("encrypted_data").notNull(),
    patientIdentifierHash: varchar("patient_identifier_hash", { length: 64 }),
    status: varchar("status", { length: 20 }).notNull().default("planned"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("treatment_episodes_user_idx").on(t.userId),
    index("treatment_episodes_user_status_idx").on(t.userId, t.status),
  ],
);

export const treatmentEpisodesRelations = relations(
  treatmentEpisodes,
  ({ one }) => ({
    user: one(users, {
      fields: [treatmentEpisodes.userId],
      references: [users.id],
    }),
  }),
);

export const insertTreatmentEpisodeSchema = createInsertSchema(
  treatmentEpisodes,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TreatmentEpisodeRow = typeof treatmentEpisodes.$inferSelect;
export type InsertTreatmentEpisodeRow = z.infer<
  typeof insertTreatmentEpisodeSchema
>;
