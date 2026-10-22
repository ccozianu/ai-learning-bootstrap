import nodemailer from "nodemailer";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { database } from "./db.js";
// No raw exception reaches stdout/stderr. Request logging is disabled to protect OAuth codes and cookies.
try {
  const cfg = config(),
    db = database(),
    mail = nodemailer.createTransport(cfg.smtp);
  const app = await buildApp(db, cfg, async (to, code) => {
    await mail.sendMail({
      from: cfg.smtpFrom,
      to,
      subject: "Your AI Learning sign-in code",
      text: `Your code is ${code}. It expires in 10 minutes. If you did not request it, ignore this message.`,
    });
  });
  await app.listen({
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? "127.0.0.1",
  });
  console.log("AI Learning API ready.");
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, async () => {
      await app.close();
      await db.$disconnect();
      mail.close();
      process.exit(0);
    });
} catch {
  console.error(
    "API startup failed. Check local configuration. Details suppressed to protect credentials.",
  );
  process.exitCode = 1;
}
