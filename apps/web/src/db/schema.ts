import {
  bigint,
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  plan: varchar("plan", { length: 20 }).notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  name: varchar("name", { length: 120 }).notNull(),
  googleId: varchar("google_id", { length: 255 }),
  role: varchar("role", { length: 20 }).notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    branding: jsonb("branding").notNull().default({}),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quizzes_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const quizVersions = pgTable(
  "quiz_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id),
    versionNumber: integer("version_number").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    branding: jsonb("branding").notNull(),
    questionsSnapshot: jsonb("questions_snapshot").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.quizId, table.versionNumber)],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id),
    orderIndex: integer("order_index").notNull(),
    type: varchar("type", { length: 30 }).notNull(),
    content: jsonb("content").notNull(),
    correctAnswer: jsonb("correct_answer").notNull(),
    pointsBase: integer("points_base").notNull().default(1000),
    timeLimitSeconds: integer("time_limit_seconds").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.quizId, table.orderIndex)],
);

export const quizSessions = pgTable(
  "quiz_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id),
    quizVersionId: uuid("quiz_version_id")
      .notNull()
      .references(() => quizVersions.id),
    hostId: uuid("host_id")
      .notNull()
      .references(() => users.id),
    pin: varchar("pin", { length: 6 }),
    shareToken: varchar("share_token", { length: 40 }),
    mode: varchar("mode", { length: 20 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("waiting"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxAttempts: integer("max_attempts").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("quiz_sessions_active_pin_unique")
      .on(table.pin)
      .where(
        sql`${table.pin} is not null and ${table.status} in ('waiting', 'playing')`,
      ),
    uniqueIndex("quiz_sessions_share_token_unique")
      .on(table.shareToken)
      .where(sql`${table.shareToken} is not null`),
  ],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => quizSessions.id),
    nickname: varchar("nickname", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    emailNormalized: varchar("email_normalized", { length: 255 }),
    avatar: varchar("avatar", { length: 50 }).notNull(),
    participantToken: varchar("participant_token", { length: 40 })
      .notNull()
      .unique(),
    score: integer("score").notNull().default(0),
    totalTimeMs: bigint("total_time_ms", { mode: "number" })
      .notNull()
      .default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("participants_session_idx").on(table.sessionId),
    unique().on(table.sessionId, table.nickname),
    index("participants_session_email_idx")
      .on(table.sessionId, table.emailNormalized)
      .where(sql`${table.emailNormalized} is not null`),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => quizSessions.id),
    attemptNumber: integer("attempt_number").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("in_progress"),
    score: integer("score").notNull().default(0),
    totalTimeMs: bigint("total_time_ms", { mode: "number" })
      .notNull()
      .default(0),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("attempts_participant_number_idx").on(
      table.participantId,
      table.attemptNumber,
    ),
    unique().on(table.participantId, table.attemptNumber),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id),
    attemptId: uuid("attempt_id").references(() => attempts.id),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => quizSessions.id),
    answer: jsonb("answer").notNull(),
    timeSpentMs: integer("time_spent_ms").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    pointsEarned: integer("points_earned").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("answers_session_question_idx").on(table.sessionId, table.questionId),
    index("answers_attempt_question_idx").on(table.attemptId, table.questionId),
    uniqueIndex("answers_live_participant_question_unique")
      .on(table.participantId, table.questionId)
      .where(sql`${table.attemptId} is null`),
    uniqueIndex("answers_attempt_question_unique")
      .on(table.attemptId, table.questionId)
      .where(sql`${table.attemptId} is not null`),
  ],
);

export const sessionEvents = pgTable("session_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => quizSessions.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: uuid("resource_id"),
  metadata: jsonb("metadata").notNull().default({}),
  ipAddress: inet("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
