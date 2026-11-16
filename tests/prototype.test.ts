import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hash } from "argon2";
import { buildApp } from "../src/app.js";
import { config, type Config } from "../src/config.js";
import {
  computeKnowledgeGraph,
  evaluateCategorySort,
  evaluateFillInBlanks,
  evaluateMultipleChoice,
} from "../src/curriculum/evaluator.js";
import {
  generatePracticeExercises,
  getNumeralPhrase,
  numToRo,
  resolveGeneratedExercise,
  takesDePreposition,
} from "../src/curriculum/generators.js";
import {
  CORE_VERBS,
  KNOWLEDGE_DEPENDENCIES,
  KNOWLEDGE_NODES,
  PRONOUN_CHECKPOINT_EXERCISES,
} from "../src/curriculum/romanian-data.js";
import type { PrismaClient, User } from "../src/generated/prisma/client.js";
import { digest } from "../src/security.js";

describe("Romanian curriculum generators & evaluators", () => {
  it("produces accurate cardinal numerals, teens, gender agreement & 'de' rule", () => {
    expect(numToRo(0)).toBe("zero");
    expect(getNumeralPhrase(1, "masculine").wordsText).toBe("un");
    expect(getNumeralPhrase(1, "feminine").wordsText).toBe("o");
    expect(getNumeralPhrase(1, "neuter").wordsText).toBe("un");
    expect(getNumeralPhrase(2, "neuter").wordsText).toBe("două");
    expect(getNumeralPhrase(12, "masculine").wordsText).toBe("doisprezece");
    expect(getNumeralPhrase(12, "feminine").wordsText).toBe("douăsprezece");
    expect(numToRo(14)).toBe("paisprezece");
    expect(numToRo(16)).toBe("șaisprezece");
    expect(getNumeralPhrase(20, "neuter").wordsText).toBe("douăzeci de");
    expect(getNumeralPhrase(1012, "feminine").wordsText).toBe(
      "o mie douăsprezece",
    );
    expect(getNumeralPhrase(2000, "masculine").wordsText).toBe("două mii de");
    expect(takesDePreposition(19)).toBe(false);
    expect(takesDePreposition(20)).toBe(true);
    expect(takesDePreposition(100)).toBe(true);
    expect(takesDePreposition(119)).toBe(false);
  });

  it("generates deterministic repeatable practice exercises across all 3 chapters", () => {
    for (const seriesId of [
      "ro-verbs-ch1",
      "ro-verbs-ch2",
      "ro-numerals-ch1",
    ]) {
      const a = generatePracticeExercises(seriesId, 0, 12);
      const b = generatePracticeExercises(seriesId, 0, 12);
      expect(a).toHaveLength(12);
      expect(a).toEqual(b);
      const resolved = resolveGeneratedExercise(a[0]!.id);
      expect(resolved?.acceptedBlanks).toEqual(a[0]!.acceptedBlanks);
    }
  });

  it("evaluates fill-in-blanks (with comma/cedilla diacritics & hint), MCQ, category sort & KG DAG", () => {
    expect(evaluateFillInBlanks(["mănânc"], ["mănânc"]).isCorrect).toBe(true);
    expect(evaluateFillInBlanks(["șase"], ["şase"]).isCorrect).toBe(true);
    expect(evaluateFillInBlanks(["cânți"], ["cânţi"]).isCorrect).toBe(true);
    const diacriticMiss = evaluateFillInBlanks(["mănânc"], ["mananc"]);
    expect(diacriticMiss.isCorrect).toBe(false);
    expect(diacriticMiss.feedback).toContain("diacritics");
    expect(PRONOUN_CHECKPOINT_EXERCISES.length).toBeGreaterThanOrEqual(4);

    expect(evaluateMultipleChoice("lucrez", "lucrez", "ok").isCorrect).toBe(
      true,
    );

    const expectedGroups = Object.fromEntries(
      CORE_VERBS.map((v) => [`a ${v.inf}`, v.group]),
    );
    expect(evaluateCategorySort(expectedGroups, expectedGroups).isCorrect).toBe(
      true,
    );

    const kg = computeKnowledgeGraph(
      [...KNOWLEDGE_NODES],
      KNOWLEDGE_DEPENDENCIES,
      [
        {
          knowledgeNodeId: "ro_pronouns_infinitive",
          attemptsCount: 2,
          correctCount: 2,
          mastered: true,
        },
      ],
    );
    const core = kg.find((n) => n.id === "ro_verb_tenses_core");
    const kingdoms = kg.find((n) => n.id === "ro_verb_kingdoms_4");
    expect(core?.status).toBe("READY");
    expect(kingdoms?.status).toBe("PREREQUISITE_NEEDED");
  });
});

describe("Parent OTT, Kid Registration, Guardian 2FA & Learning Isolation", () => {
  let parent: User;
  let kid: User;
  let app: Awaited<ReturnType<typeof buildApp>>;

  const cfg: Config = {
    origin: "http://127.0.0.1:5173",
    secret: "prototype-secret-".repeat(4),
    secure: false,
    allowlist: "/nonexistent",
    googleClientId: "",
    googleClientSecret: "",
    smtpFrom: "dev@localhost",
    devConsoleAuth: true,
    devParentEmail: "ccozianu@gmail.com",
  };

  const mail = vi.fn();
  const db = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    session: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    challenge: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    trustedDevice: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    devLoginToken: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    parentCurriculumApproval: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    curriculumVersion: { findMany: vi.fn(), findUnique: vi.fn() },
    knowledgeNode: { findMany: vi.fn() },
    knowledgeDependency: { findMany: vi.fn() },
    lesson: { findUnique: vi.fn() },
    exercise: { findUnique: vi.fn() },
    exerciseAttempt: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    studentKnowledgeState: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    parent = {
      authVersion: 0,
      id: "11111111-1111-4111-8111-111111111111",
      email: "ccozianu@gmail.com",
      googleSubject: null,
      username: null,
      displayName: "Parent Owner",
      roles: ["PARENT"],
      accountStatus: "ACTIVE",
      guardianUserId: null,
      birthYear: null,
      birthYearAttestedAt: null,
      gdprConsentGrantedAt: null,
      gdprConsentWithdrawnAt: null,
      gdprConsentVersion: null,
      passwordHash: null,
      signInTypes: ["DEV_TOKEN"],
      lastSignInType: "DEV_TOKEN",
      passwordFailures: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    kid = {
      authVersion: 0,
      id: "22222222-2222-4222-8222-222222222222",
      email: null,
      googleSubject: null,
      username: "matei_ro",
      displayName: "Matei",
      roles: ["KID"],
      accountStatus: "ACTIVE",
      guardianUserId: parent.id,
      birthYear: 2016,
      birthYearAttestedAt: new Date(),
      gdprConsentGrantedAt: new Date(),
      gdprConsentWithdrawnAt: null,
      gdprConsentVersion: "v1.0-ro",
      passwordHash: await hash("passphrase-for-matei"),
      signInTypes: ["PASSWORD"],
      lastSignInType: "PASSWORD",
      passwordFailures: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.$transaction.mockImplementation(async (work) =>
      typeof work === "function" ? work(db) : Promise.all(work),
    );
    db.user.updateMany.mockResolvedValue({ count: 1 });
    db.challenge.deleteMany.mockResolvedValue({ count: 1 });
    mail.mockResolvedValue(undefined);
    app = await buildApp(db as unknown as PrismaClient, cfg, mail);
  });

  afterEach(async () => {
    await app.close();
  });

  it("exchanges a parent startup OTT once and isolates /api/learn from PARENT", async () => {
    db.devLoginToken.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    db.devLoginToken.findUnique.mockResolvedValue({
      tokenHash: digest("valid-ott-secret-value-1234"),
      user: parent,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/dev-token",
      headers: { origin: cfg.origin },
      payload: { token: "valid-ott-secret-value-1234" },
    });
    expect(res.statusCode).toBe(200);
    const cookieVal = res.cookies.find((c) => c.name === "ai-session")?.value;
    expect(cookieVal).toBeTruthy();

    // Replaying same OTT is rejected.
    const replay = await app.inject({
      method: "POST",
      url: "/api/auth/dev-token",
      headers: { origin: cfg.origin },
      payload: { token: "valid-ott-secret-value-1234" },
    });
    expect(replay.statusCode).toBe(401);

    // Parent cannot enter student learning API (role isolation).
    db.session.findUnique.mockResolvedValue({
      authVersion: 0,
      user: parent,
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
    });
    const learnDenied = await app.inject({
      method: "GET",
      url: "/api/learn/overview",
      cookies: { "ai-session": cookieVal! },
    });
    expect(learnDenied.statusCode).toBe(403);
  });

  it("routes kid 2FA challenge to guardian email and blocks unapproved curriculum access", async () => {
    db.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.username === "matei_ro") return kid;
      if (where.id === parent.id) return parent;
      return null;
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/password",
      headers: { origin: cfg.origin },
      payload: { username: "matei_ro", password: "passphrase-for-matei" },
    });
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.json().authenticated).toBe(false);
    expect(mail).toHaveBeenCalledWith(
      "ccozianu@gmail.com",
      expect.stringMatching(/^\d{6}$/),
    );

    // Kid cannot access parent dashboard or unapproved lesson.
    db.session.findUnique.mockResolvedValue({
      authVersion: 0,
      user: kid,
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
    });
    const parentDenied = await app.inject({
      method: "GET",
      url: "/api/parent/dashboard",
      cookies: { "ai-session": "kid-sess" },
    });
    expect(parentDenied.statusCode).toBe(403);

    db.lesson.findUnique.mockResolvedValue({
      id: "ro-v1-tenses",
      seriesId: "ro-verbs-ch1",
      series: { curriculumVersionId: "romanian-fundamentals@1.0.0" },
      exercises: [],
    });
    db.parentCurriculumApproval.findUnique.mockResolvedValue(null);
    const lessonDenied = await app.inject({
      method: "GET",
      url: "/api/learn/lessons/ro-v1-tenses",
      cookies: { "ai-session": "kid-sess" },
    });
    expect(lessonDenied.statusCode).toBe(403);
  });

  it("records deterministic attempt and updates mastery once curriculum is approved", async () => {
    db.user.findUnique.mockResolvedValue(parent);
    db.session.findUnique.mockResolvedValue({
      authVersion: 0,
      user: kid,
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
    });
    db.exerciseAttempt.findUnique.mockResolvedValue(null);
    db.lesson.findUnique.mockResolvedValue({
      id: "ro-v1-practice",
      seriesId: "ro-verbs-ch1",
      kind: "PRACTICE_SHEET",
      knowledgeNodeId: "ro_verb_tenses_core",
      series: { curriculumVersionId: "romanian-fundamentals@1.0.0" },
    });
    db.parentCurriculumApproval.findUnique.mockResolvedValue({
      kidUserId: kid.id,
      curriculumVersionId: "romanian-fundamentals@1.0.0",
      revokedAt: null,
    });
    db.exerciseAttempt.findMany.mockResolvedValue([{ exerciseId: "ex-1" }]);
    db.studentKnowledgeState.findUnique.mockResolvedValue(null);
    db.studentKnowledgeState.upsert.mockResolvedValue({
      studentUserId: kid.id,
      knowledgeNodeId: "ro_verb_tenses_core",
      attemptsCount: 1,
      correctCount: 1,
      mastered: false,
    });

    const sampleEx = generatePracticeExercises("ro-verbs-ch1", 0, 12)[0]!;
    const attemptRes = await app.inject({
      method: "POST",
      url: "/api/learn/attempts",
      headers: { origin: cfg.origin },
      cookies: { "ai-session": "kid-sess" },
      payload: {
        clientEventId: "33333333-3333-4333-8333-333333333333",
        lessonId: "ro-v1-practice",
        exerciseId: sampleEx.id,
        answer: sampleEx.acceptedBlanks,
      },
    });
    expect(attemptRes.statusCode).toBe(200);
    expect(attemptRes.json().isCorrect).toBe(true);
    expect(attemptRes.json().nodeState.correctCount).toBe(1);
    expect(db.exerciseAttempt.create).toHaveBeenCalled();

    // Concurrent P2002 race on clientEventId replays cleanly with slotResults instead of 503.
    db.exerciseAttempt.create.mockRejectedValueOnce({ code: "P2002" });
    db.exerciseAttempt.findUnique.mockResolvedValueOnce({
      clientEventId: "33333333-3333-4333-8333-333333333333",
      studentUserId: kid.id,
      exerciseId: sampleEx.id,
      lessonId: "ro-v1-practice",
      knowledgeNodeId: "ro_verb_tenses_core",
      submittedAnswer: sampleEx.acceptedBlanks,
      isCorrect: true,
      feedback: "Corect! Great job!",
    });
    const replayRes = await app.inject({
      method: "POST",
      url: "/api/learn/attempts",
      headers: { origin: cfg.origin },
      cookies: { "ai-session": "kid-sess" },
      payload: {
        clientEventId: "33333333-3333-4333-8333-333333333333",
        lessonId: "ro-v1-practice",
        exerciseId: sampleEx.id,
        answer: sampleEx.acceptedBlanks,
      },
    });
    expect(replayRes.statusCode).toBe(200);
    expect(replayRes.json().idempotentReplay).toBe(true);
    expect(replayRes.json().slotResults).toBeTruthy();
  });

  it("enforces practice-sheet binding, consent lock, guardian allowlist & prod config guard", async () => {
    // 1. Generated exercise rejected on non-PRACTICE_SHEET lesson
    db.user.findUnique.mockResolvedValue(parent);
    db.session.findUnique.mockResolvedValue({
      authVersion: 0,
      user: kid,
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
    });
    db.lesson.findUnique.mockResolvedValue({
      id: "ro-v1-tenses",
      seriesId: "ro-verbs-ch1",
      kind: "PRESENTATION",
      knowledgeNodeId: "ro_pronouns_infinitive",
      series: { curriculumVersionId: "romanian-fundamentals@1.0.0" },
    });
    db.parentCurriculumApproval.findUnique.mockResolvedValue({
      kidUserId: kid.id,
      curriculumVersionId: "romanian-fundamentals@1.0.0",
      revokedAt: null,
    });
    const sampleEx = generatePracticeExercises("ro-verbs-ch1", 0, 12)[0]!;
    const badLessonRes = await app.inject({
      method: "POST",
      url: "/api/learn/attempts",
      headers: { origin: cfg.origin },
      cookies: { "ai-session": "kid-sess" },
      payload: {
        clientEventId: "44444444-4444-4444-8444-444444444444",
        lessonId: "ro-v1-tenses",
        exerciseId: sampleEx.id,
        answer: sampleEx.acceptedBlanks,
      },
    });
    expect(badLessonRes.statusCode).toBe(400);

    // 2. Parent cannot lift SUSPENDED kid status via consent endpoint
    db.session.findUnique.mockResolvedValue({
      authVersion: 0,
      user: parent,
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
    });
    db.user.findUnique.mockResolvedValueOnce({
      ...kid,
      accountStatus: "SUSPENDED",
    });
    const suspendedConsent = await app.inject({
      method: "POST",
      url: `/api/parent/kids/${kid.id}/consent`,
      headers: { origin: cfg.origin },
      cookies: { "ai-session": "parent-sess" },
      payload: { grant: true },
    });
    expect(suspendedConsent.statusCode).toBe(403);

    // 3. Guardian removal from allowlist blocks kid session
    db.user.findUnique.mockResolvedValue({
      ...parent,
      email: "unapproved_other@gmail.com",
    });
    db.session.findUnique.mockResolvedValue({
      authVersion: 0,
      user: kid,
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
    });
    const kidBlocked = await app.inject({
      method: "GET",
      url: "/api/learn/overview",
      cookies: { "ai-session": "kid-sess" },
    });
    expect(kidBlocked.statusCode).toBe(401);

    // 4. DEV_CONSOLE_AUTH forbidden in NODE_ENV=production
    const prevNodeEnv = process.env.NODE_ENV;
    const prevDev = process.env.DEV_CONSOLE_AUTH;
    try {
      process.env.NODE_ENV = "production";
      process.env.DEV_CONSOLE_AUTH = "true";
      expect(() => config()).toThrow(/DEV_CONSOLE_AUTH/);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevDev === undefined) delete process.env.DEV_CONSOLE_AUTH;
      else process.env.DEV_CONSOLE_AUTH = prevDev;
    }
  });
});
