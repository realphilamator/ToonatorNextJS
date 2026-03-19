"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/config";
import Includes from "@/components/Includes";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [status, setStatus]         = useState(null); // "success" | "error"
  const [message, setMessage]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [ready, setReady]           = useState(false); // true once Supabase confirms recovery session

  useEffect(() => {
    const { data: { subscription } } = db.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    setMessage("");

    if (password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await db.auth.updateUser({ password });
      if (error) {
        setStatus("error");
        setMessage(error.message || "Something went wrong. Please try again.");
      } else {
        router.replace("/");
      }
    } finally {
      setLoading(false);
    }
  }

  const isValid = password.length > 0 && confirm.length > 0;

  return (
    <>
      <Includes />
      <div id="donate_placeholder" />
      <div id="header_placeholder" />
      <div id="content_wrap">
        <div id="content">
          <h2>Password reset</h2>

          {!ready ? (
            <p>Verifying your reset link…</p>
          ) : (
            <>
              <b>Please enter your new password</b>
              <div className="reg_form">
                <form onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="reg_password">New password:</label>
                    <input
                      type="password"
                      id="reg_password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg_confirm">Confirm password:</label>
                    <input
                      type="password"
                      id="reg_confirm"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>

                  {status && (
                    <div
                      style={{
                        marginLeft: "100px",
                        marginBottom: "8px",
                        color: status === "success" ? "green" : "red",
                      }}
                    >
                      {message}
                    </div>
                  )}

                  <div>
                    <input
                      style={{ marginLeft: "100px" }}
                      type="submit"
                      value={loading ? "Saving…" : "Save password"}
                      id="reg_register"
                      className="complete"
                      disabled={!isValid || loading}
                    />
                  </div>
                </form>
              </div>
            </>
          )}

          <div style={{ clear: "both" }} />
        </div>
      </div>
      <div id="footer_placeholder" />
    </>
  );
}