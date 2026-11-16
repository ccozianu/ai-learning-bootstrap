import nodemailer from "nodemailer";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { seedPrototypeCurriculum } from "./curriculum/seed.js";
import { database } from "./db.js";
import { digest, token } from "./security.js";

// No raw exception reaches stdout/stderr. Request logging is disabled to protect OAuth codes and cookies.
try {
  const cfg = config();
  const db = database();
  const mail = cfg.smtp ? nodemailer.createTransport(cfg.smtp) : undefined;

  const seedInfo = await seedPrototypeCurriculum(
    db,
    cfg.devConsoleAuth ? cfg.devParentEmail : undefined,
  );
  if (seedInfo.curriculumAction === "skipped_immutable_conflict") {
    console.warn(
      "[Curriculum Seed] Existing version hash differs from code definition; bump curriculum version or run db:seed -- --force in dev.",
    );
  }

  const sendCode = async (to: string, code: string) => {
    if (mail) {
      await mail.sendMail({
        from: cfg.smtpFrom,
        to,
        subject: "Your AI Learning sign-in code",
        text: `Your code is ${code}. It expires in 10 minutes. If you did not request it, ignore this message.`,
      });
      return;
    }
    if (cfg.devConsoleAuth) {
      console.log(
        `[DEV EMAIL CHALLENGE] 6-digit code for ${to}: ${code} (expires in 10 min)`,
      );
      return;
    }
    throw new Error("SMTP transport not configured.");
  };

  const app = await buildApp(db, cfg, sendCode);
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "127.0.0.1";
  await app.listen({ port, host });
  console.log("AI Learning API ready.");

  if (cfg.devConsoleAuth && seedInfo.devParentUserId) {
    const rawOtt = token();
    await db.devLoginToken.deleteMany({
      where: { userId: seedInfo.devParentUserId, consumedAt: null },
    });
    await db.devLoginToken.create({
      data: {
        tokenHash: digest(rawOtt),
        userId: seedInfo.devParentUserId,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
    console.log(
      "================================================================",
    );
    console.log(
      `[DEV CONSOLE AUTH] Parent bootstrap ready for ${cfg.devParentEmail}`,
    );
    console.log(`One-Time Login URL: ${cfg.origin}/?ott=${rawOtt}`);
    console.log(`One-Time Token:     ${rawOtt}`);
    if (!mail) {
      console.log(
        "Parent 2FA / email challenge codes will print here when SMTP is unset.",
      );
    }
    console.log(
      "================================================================",
    );
  }

  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, async () => {
      await app.close();
      await db.$disconnect();
      mail?.close();
      process.exit(0);
    });
  }
} catch {
  console.error(
    "API startup failed. Check local configuration. Details suppressed to protect credentials.",
  );
  process.exitCode = 1;
}
