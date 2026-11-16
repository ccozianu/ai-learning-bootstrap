import React, { useEffect, useState, type FormEvent } from "react";
import { api, type ParentDashboardData, type User } from "../client";

export function ParentDashboard({
  user,
  onLogout,
  onRefreshUser,
}: {
  user: User;
  onLogout: (forget?: boolean) => Promise<void>;
  onRefreshUser: () => Promise<void>;
}) {
  const [dashboard, setDashboard] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [resetKidId, setResetKidId] = useState<string | null>(null);
  const [showAdultPasswordForm, setShowAdultPasswordForm] = useState(false);

  const load = async () => {
    try {
      setDashboard(await api<ParentDashboardData>("/parent/dashboard"));
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not load parent dashboard.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateKid(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    await runAction(async () => {
      await api("/parent/kids", {
        username: String(data.get("username") ?? "")
          .trim()
          .toLowerCase(),
        displayName: String(data.get("displayName") ?? "").trim(),
        birthYear: Number(data.get("birthYear")),
        password: String(data.get("password") ?? ""),
        gdprConsentGranted: data.get("gdprConsentGranted") === "on",
      });
      form.reset();
      await load();
      setNotice(
        "Student account created. Approve a curriculum below so they can begin learning!",
      );
    });
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <div>
          <a className="brand dark-brand" href="/">
            a<span>i</span> / learning
          </a>
          <span className="role-pill">Parent Dashboard</span>
        </div>
        <div className="topbar-actions">
          <span className="muted-inline small">
            Signed in as <strong>{user.email}</strong>
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => setShowAdultPasswordForm((v) => !v)}
          >
            {user.username ? "Password Settings" : "Set Parent Password"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => void onLogout(false)}
          >
            Sign out
          </button>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => void onLogout(true)}
          >
            Forget browsers
          </button>
        </div>
      </header>

      {notice && (
        <div role="status" className="notice workspace-notice">
          {notice}
        </div>
      )}

      {showAdultPasswordForm && (
        <section className="ws-card">
          <h3>Parent Local Password Sign-In</h3>
          <p className="hint">
            Signed in with {user.lastSignInType?.toLowerCase() ?? "session"}.
            Usernames must be 3–32 lowercase alphanumeric/underscore characters;
            passphrases must be 12–128 characters.
          </p>
          <form
            className="inline-grid-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void runAction(async () => {
                await api("/auth/password/setup", {
                  username: f.get("username"),
                  password: f.get("password"),
                });
                await onRefreshUser();
                setShowAdultPasswordForm(false);
                setNotice("Parent password sign-in saved.");
              });
            }}
          >
            <label>
              Parent username
              <input
                name="username"
                required
                pattern="[a-z0-9_]{3,32}"
                defaultValue={user.username ?? ""}
              />
            </label>
            <label>
              New passphrase (12+ chars)
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
              />
            </label>
            <button type="submit" disabled={busy}>
              Save Parent Password
            </button>
          </form>
        </section>
      )}

      <div className="ws-grid-2">
        <section className="ws-card">
          <p className="eyebrow">FAMILY ONBOARDING</p>
          <h2>Register a Kid Account</h2>
          <p className="muted">
            Kids never need Gmail or Google accounts. Your parent email routes
            any unrecognized-browser 2FA codes.
          </p>
          <form onSubmit={(e) => void handleCreateKid(e)}>
            <label>
              Student username (lowercase, unique)
              <input
                name="username"
                required
                pattern="[a-z0-9_]{3,32}"
                minLength={3}
                maxLength={32}
                placeholder="e.g. andrei_ro"
              />
            </label>
            <label>
              First name / nickname
              <input
                name="displayName"
                required
                maxLength={60}
                placeholder="e.g. Andrei"
              />
            </label>
            <label>
              Birth year (parent cognizance)
              <input
                name="birthYear"
                type="number"
                required
                min={new Date().getUTCFullYear() - 18}
                max={new Date().getUTCFullYear() - 4}
                defaultValue={new Date().getUTCFullYear() - 9}
              />
            </label>
            <label>
              Student passphrase (12–128 chars)
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                placeholder="Long easy-to-remember phrase"
              />
            </label>
            <label className="checkbox">
              <input type="checkbox" name="gdprConsentGranted" defaultChecked />
              <span>
                I grant GDPR parental consent (`v1.0-ro`) for this child to use
                approved curricula (no direct LLM access).
              </span>
            </label>
            <button type="submit" disabled={busy}>
              Register Kid Account
            </button>
          </form>
        </section>

        <section className="ws-card">
          <p className="eyebrow">AVAILABLE CURRICULUM CATALOG</p>
          <h2>Romanian Curriculum Snapshot</h2>
          {loading ? (
            <p>Loading catalog…</p>
          ) : (
            dashboard?.curricula.map((cv) => (
              <div key={cv.id} className="catalog-box">
                <div className="catalog-head">
                  <strong>{cv.title}</strong>
                  <span className="tag-pill">{cv.license}</span>
                </div>
                <p className="small muted-inline">{cv.description}</p>
                <p className="hint">Attribution: {cv.attribution}</p>
                <ul className="series-outline">
                  {cv.series.map((s) => (
                    <li key={s.id}>
                      <strong>{s.title}</strong> ({s.lessons.length} lessons)
                      <div className="hint">{s.subtitle}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>

      <section className="ws-card">
        <p className="eyebrow">MY KIDS, APPROVALS & MASTERY</p>
        <h2>Registered Students ({dashboard?.kids.length ?? 0})</h2>
        {loading ? (
          <p>Loading students…</p>
        ) : !dashboard?.kids.length ? (
          <p className="muted">
            No kid accounts registered yet. Use the form above to add your first
            student!
          </p>
        ) : (
          <div className="kids-list">
            {dashboard.kids.map((kid) => (
              <article key={kid.id} className="kid-card">
                <div className="kid-header">
                  <div>
                    <h3>{kid.displayName ?? "Student"}</h3>
                    <p className="small muted-inline">
                      Username:{" "}
                      <strong>{kid.username ?? "Erased (GDPR)"}</strong> · Birth
                      year: {kid.birthYear ?? "Cleared"} · Attempts:{" "}
                      {kid.attemptsTotal}
                    </p>
                  </div>
                  <span
                    className={`status-pill status-${kid.accountStatus.toLowerCase()}`}
                  >
                    {kid.accountStatus}
                  </span>
                </div>

                {kid.accountStatus !== "ANONYMIZED" && (
                  <>
                    <div className="approval-row">
                      <strong>Curriculum Approvals:</strong>
                      {dashboard.curricula.map((cv) => {
                        const isApproved = kid.approvedVersionIds.includes(
                          cv.id,
                        );
                        return (
                          <button
                            key={cv.id}
                            type="button"
                            disabled={busy}
                            className={
                              isApproved ? "btn-approved" : "btn-secondary"
                            }
                            onClick={() =>
                              void runAction(async () => {
                                await api("/parent/approvals", {
                                  kidId: kid.id,
                                  curriculumVersionId: cv.id,
                                  approved: !isApproved,
                                });
                                await load();
                                setNotice(
                                  !isApproved
                                    ? `Approved "${cv.title}" for ${kid.displayName}.`
                                    : `Revoked "${cv.title}" for ${kid.displayName}.`,
                                );
                              })
                            }
                          >
                            {isApproved
                              ? `Approved: ${cv.title} (Click to revoke)`
                              : `Approve: ${cv.title}`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mastery-mini-grid">
                      {kid.mastery.map((m) => (
                        <div
                          key={m.id}
                          className={`mastery-pill ${m.status.toLowerCase()}`}
                        >
                          <div className="small">
                            <strong>{m.title}</strong>
                          </div>
                          <div className="hint">
                            {m.status === "MASTERED"
                              ? "Mastered"
                              : m.status === "READY"
                                ? "Ready"
                                : "Prereq needed"}{" "}
                            · {m.correctCount}/{m.attemptsCount} right
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="kid-actions">
                      {kid.accountStatus !== "SUSPENDED" && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() =>
                            void runAction(async () => {
                              const grant = kid.accountStatus !== "ACTIVE";
                              await api(`/parent/kids/${kid.id}/consent`, {
                                grant,
                              });
                              await load();
                              setNotice(
                                grant
                                  ? "GDPR consent granted; account active."
                                  : "GDPR consent withdrawn; student sessions revoked.",
                              );
                            })
                          }
                        >
                          {kid.accountStatus === "ACTIVE"
                            ? "Withdraw GDPR Consent"
                            : "Grant GDPR Consent"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={busy}
                        onClick={() =>
                          setResetKidId((cur) =>
                            cur === kid.id ? null : kid.id,
                          )
                        }
                      >
                        Reset Passphrase
                      </button>

                      <button
                        type="button"
                        className="btn-danger"
                        disabled={busy}
                        onClick={() => {
                          const label =
                            kid.username ?? kid.displayName ?? "this student";
                          if (
                            !confirm(
                              `Permanently anonymize ${label}'s PII (GDPR Erasure)?`,
                            )
                          ) {
                            return;
                          }
                          void runAction(async () => {
                            await api(
                              `/parent/kids/${kid.id}`,
                              undefined,
                              "DELETE",
                            );
                            await load();
                            setNotice("GDPR kid erasure completed.");
                          });
                        }}
                      >
                        GDPR Erase Kid
                      </button>
                    </div>

                    {resetKidId === kid.id && (
                      <form
                        className="inline-grid-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void runAction(async () => {
                            await api(`/parent/kids/${kid.id}/reset-password`, {
                              password: f.get("password"),
                            });
                            setResetKidId(null);
                            setNotice(
                              `Reset passphrase for ${kid.displayName}.`,
                            );
                          });
                        }}
                      >
                        <label>
                          New student passphrase (12+ chars)
                          <input
                            name="password"
                            type="password"
                            required
                            minLength={12}
                            maxLength={128}
                          />
                        </label>
                        <button type="submit" disabled={busy}>
                          Confirm Password Reset
                        </button>
                      </form>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
