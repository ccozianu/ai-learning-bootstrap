import React, { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
type User = {
  email: string;
  username: string | null;
  signInTypes: string[];
  lastSignInType: string;
};
async function api<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: data === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "Request could not be completed.");
  return result;
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login"),
    [challenge, setChallenge] = useState("");
  const [notice, setNotice] = useState(
    new URLSearchParams(location.search).has("error")
      ? "Sign-in was not completed. Access is limited to approved Gmail accounts."
      : "",
  );
  const refresh = async () => {
    try {
      setUser(await api<User>("/me"));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
    history.replaceState(null, "", "/");
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
      setUser(null);
      setChallenge("");
      setNotice("Signed out.");
    } catch {
      setNotice("Sign-out failed. Please retry.");
    } finally {
      setBusy(false);
    }
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
          AI LEARNING <span>EARLY ACCESS · 01</span>
        </footer>
      </aside>
      <section className="panel">
        <div className="card">
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h2>
            {user
              ? "You’re in."
              : mode === "signup"
                ? "Start here."
                : "Welcome back."}
          </h2>
          {notice && (
            <div role="status" className="notice">
              {notice}
            </div>
          )}
          {loading ? (
            <p>Checking your session…</p>
          ) : user ? (
            <>
              <p className="muted">
                Signed in as <strong>{user.email}</strong>
              </p>
              <div className="profile">
                <span>Sign-in methods</span>
                <strong>{user.signInTypes.join(" + ").toLowerCase()}</strong>
                <span>Username</span>
                <strong>{user.username ?? "Not set"}</strong>
              </div>
              <h3>
                {user.username
                  ? "Update password sign-in"
                  : "Add password sign-in"}
              </h3>
              <p className="muted small">
                Sign in with Google within the last 10 minutes to set a
                password. You can always use Google to regain access.
              </p>
              <form
                onSubmit={(e) =>
                  void submit(e, async (f) => {
                    await api("/auth/password/setup", {
                      username: f.get("username"),
                      password: f.get("password"),
                    });
                    await refresh();
                    setNotice(
                      "Password sign-in is ready. Previously remembered browsers have been cleared.",
                    );
                  })
                }
              >
                <label>
                  Username
                  <input
                    name="username"
                    autoComplete="username"
                    required
                    pattern="[a-z0-9_]{3,32}"
                    minLength={3}
                    maxLength={32}
                    defaultValue={user.username ?? ""}
                  />
                </label>
                <label>
                  New password
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                  />
                </label>
                <p className="hint">
                  At least 12 characters. Username: lowercase letters, numbers,
                  underscores.
                </p>
                <button disabled={busy}>Save password sign-in</button>
              </form>
              <div className="actions">
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void logout()}
                >
                  Sign out
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void logout(true)}
                >
                  Forget all browsers & sign out
                </button>
              </div>
            </>
          ) : challenge ? (
            <>
              <p className="muted">
                We sent a six-digit code to your approved Gmail address. It
                expires in 10 minutes.
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
                  : "Sign in to your personal learning space."}
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
                    Forgot your password? Continue with Google, then set a new
                    one.
                  </p>
                </>
              )}
              <div className="access">
                <span className="dot" />
                <p>
                  Early access is by invitation.
                  <br />
                  <span>
                    Only addresses on the approved Gmail list can join.
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
