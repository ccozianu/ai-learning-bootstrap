import React, { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  api,
  clearImpersonationToken,
  getImpersonationToken,
  setImpersonationToken,
  type User,
} from "./client";
import { ParentDashboard } from "./components/ParentDashboard";
import { StudentPortal } from "./components/StudentPortal";
import "./style.css";

let launchHandled = false;

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [challenge, setChallenge] = useState("");
  const [showDevTokenBox, setShowDevTokenBox] = useState(false);
  const [notice, setNotice] = useState(
    new URLSearchParams(location.search).has("error")
      ? "Sign-in was not completed. Access is limited to approved Gmail accounts."
      : "",
  );

  const refresh = async () => {
    const hadImpToken = Boolean(getImpersonationToken());
    try {
      setUser(await api<User>("/me"));
    } catch {
      if (hadImpToken) {
        // Stale or expired tab token: clear it and retry /me as the browser session.
        clearImpersonationToken();
        try {
          setUser(await api<User>("/me"));
          setNotice("Impersonation preview ended or expired.");
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(
      location.hash.startsWith("#") ? location.hash.slice(1) : location.hash,
    );
    const ott = params.get("ott");
    const impersonateCode =
      hashParams.get("impersonate") ?? params.get("impersonate");
    history.replaceState(null, "", "/");

    if (impersonateCode && !launchHandled) {
      launchHandled = true;
      void (async () => {
        try {
          clearImpersonationToken();
          const res = await api<{ tabToken: string }>(
            "/auth/impersonate/exchange",
            { code: impersonateCode },
          );
          setImpersonationToken(res.tabToken);
          setNotice(
            "Impersonation preview active in this tab (student progress untouched).",
          );
        } catch (error) {
          clearImpersonationToken();
          setNotice(
            error instanceof Error
              ? error.message
              : "Impersonation session could not be started.",
          );
        } finally {
          await refresh();
        }
      })();
      return;
    }

    if (ott && !launchHandled) {
      launchHandled = true;
      void (async () => {
        try {
          clearImpersonationToken();
          await api("/auth/dev-token", { token: ott });
          setNotice("Signed in via one-time parent console token.");
        } catch (error) {
          setNotice(
            error instanceof Error
              ? error.message
              : "One-time token could not be verified.",
          );
        } finally {
          await refresh();
        }
      })();
      return;
    }

    if (!launchHandled) {
      void refresh();
    }
  }, []);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: (form: FormData) => Promise<void>,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      clearImpersonationToken();
      await action(data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout(forget = false) {
    setBusy(true);
    try {
      await api(forget ? "/auth/forget-browsers" : "/auth/logout", {});
      clearImpersonationToken();
      setUser(null);
      setChallenge("");
      setNotice("Signed out.");
    } catch {
      setNotice("Sign-out failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function exitImpersonation() {
    setBusy(true);
    try {
      await api("/auth/impersonate/exit", {});
    } catch {
      // Clear tab token even if server session already expired.
    } finally {
      clearImpersonationToken();
      setBusy(false);
      window.close();
      await refresh();
    }
  }

  if (!loading && user) {
    if (user.impersonation?.active || user.roles.includes("KID")) {
      return (
        <StudentPortal
          user={user}
          onLogout={() => logout(false)}
          onExitImpersonation={
            user.impersonation?.active ? exitImpersonation : undefined
          }
        />
      );
    }
    return (
      <ParentDashboard
        user={user}
        initialNotice={notice}
        onLogout={logout}
        onRefreshUser={refresh}
      />
    );
  }

  return (
    <main>
      <aside>
        <a className="brand" href="/">
          a<span>i</span> / learning
        </a>
        <div className="intro">
          <p className="eyebrow">A SPACE TO BEGIN</p>
          <h1>
            Stay curious.
            <br />
            Make room
            <br />
            for <em>what’s next.</em>
          </h1>
          <p>
            Your learning journey starts with a simple,
            <br />
            secure place to call your own.
          </p>
        </div>
        <footer>
          AI LEARNING <span>EARLY ACCESS · PROTOTYPE</span>
        </footer>
      </aside>
      <section className="panel">
        <div className="card">
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h2>{mode === "signup" ? "Start here." : "Welcome back."}</h2>
          {notice && (
            <div role="status" className="notice">
              {notice}
            </div>
          )}
          {loading ? (
            <p>Checking your session…</p>
          ) : challenge ? (
            <>
              <p className="muted">
                We sent a six-digit code to your parent or approved Gmail
                address. It expires in 10 minutes.
              </p>
              <form
                onSubmit={(e) =>
                  void submit(e, async (f) => {
                    await api("/auth/password/confirm", {
                      challengeId: challenge,
                      code: f.get("code"),
                      remember: f.get("remember") === "on",
                    });
                    setChallenge("");
                    await refresh();
                  })
                }
              >
                <label>
                  Confirmation code
                  <input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </label>
                <label className="checkbox">
                  <input type="checkbox" name="remember" /> Remember this
                  browser for 30 days
                </label>
                <button disabled={busy}>Confirm & continue</button>
              </form>
              <button className="text-button" onClick={() => setChallenge("")}>
                Start again / request a new code
              </button>
            </>
          ) : (
            <>
              <p className="muted">
                {mode === "signup"
                  ? "Join with your pre-approved Gmail account."
                  : "Sign in as a parent or with your student username."}
              </p>
              <a className="google" href="/api/auth/google">
                <span aria-hidden="true">G</span>Continue with Google
                <span aria-hidden="true">↗</span>
              </a>
              {mode === "login" && (
                <>
                  <div className="divider">or use your username</div>
                  <form
                    onSubmit={(e) =>
                      void submit(e, async (f) => {
                        const result = await api<{
                          authenticated: boolean;
                          challengeId?: string;
                        }>("/auth/password", {
                          username: f.get("username"),
                          password: f.get("password"),
                        });
                        if (result.authenticated) await refresh();
                        else setChallenge(result.challengeId!);
                      })
                    }
                  >
                    <label>
                      Username
                      <input
                        name="username"
                        autoComplete="username"
                        minLength={3}
                        maxLength={80}
                        required
                      />
                    </label>
                    <label>
                      Password
                      <input
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        maxLength={128}
                        required
                      />
                    </label>
                    <button disabled={busy}>
                      {busy ? "Signing in…" : "Sign in"}
                      <span aria-hidden="true">→</span>
                    </button>
                  </form>
                  <p className="hint">
                    Kids sign in with username & password; 2FA goes to the
                    parent’s email (or server console in local dev).
                  </p>
                  <div className="dev-token-toggle">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setShowDevTokenBox((v) => !v)}
                    >
                      {showDevTokenBox
                        ? "Hide console one-time token"
                        : "Use local parent console one-time token"}
                    </button>
                    {showDevTokenBox && (
                      <form
                        onSubmit={(e) =>
                          void submit(e, async (f) => {
                            await api("/auth/dev-token", {
                              token: String(f.get("token") ?? "").trim(),
                            });
                            await refresh();
                          })
                        }
                      >
                        <label>
                          One-time token from server console
                          <input
                            name="token"
                            type="password"
                            required
                            placeholder="Paste console token"
                          />
                        </label>
                        <button disabled={busy}>
                          Sign in with One-Time Token
                        </button>
                      </form>
                    )}
                  </div>
                </>
              )}
              <div className="access">
                <span className="dot" />
                <p>
                  Early access is by invitation.
                  <br />
                  <span>
                    Only addresses on the approved Gmail list (or parent-created
                    kids) can join.
                  </span>
                </p>
              </div>
              <p className="switch">
                {mode === "login" ? "New here?" : "Already have an account?"}{" "}
                <button
                  className="text-button"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setNotice("");
                  }}
                >
                  {mode === "login" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
        <div className="bottom">A little curiosity goes a long way.</div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
