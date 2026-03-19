"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/config";
import Includes from "@/components/Includes";

export default function RecoverPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [status, setStatus]         = useState(null); // "success" | "error"
  const [message, setMessage]       = useState("");
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    db.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/");
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    setMessage("");

    const value = (email.trim() || username.trim());
    if (!value) {
      setStatus("error");
      setMessage("Please enter your username or e-mail.");
      return;
    }

    setLoading(true);
    try {
      let resolvedEmail = email.trim();

      if (!resolvedEmail) {
        const { data: profile, error: profileError } = await db
          .from("profiles")
          .select("email")
          .eq("username", username.trim())
          .maybeSingle();

        if (profileError || !profile) {
          setStatus("error");
          setMessage("Username not found.");
          return;
        }
        resolvedEmail = profile.email;
      }

      const { error } = await db.auth.resetPasswordForEmail(resolvedEmail, {
        redirectTo: `${window.location.origin}/recover/forgot-password`,
      });

      if (error) {
        setStatus("error");
        setMessage(error.message || "Something went wrong. Please try again.");
      } else {
        setStatus("success");
        setMessage("Check your inbox — we sent you a password-reset link.");
      }
    } finally {
      setLoading(false);
    }
  }

  const isValid = username.trim().length > 0 || email.trim().length > 0;

  return (
    <>
      <Includes />
      <div id="donate_placeholder" />
      <div id="header_placeholder" />
      <div id="content_wrap">
        <div id="content">
          <h2>Password recovery</h2>
          <b>Please specify your e-mail or username</b>

          <div className="reg_form">
            <form onSubmit={handleSubmit}>
              <div>
                <label htmlFor="reg_username">Username:</label>
                <input
                  type="text"
                  id="reg_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="reg_email">E-mail:</label>
                <input
                  type="text"
                  id="reg_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              {/* Status message */}
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
                  value={loading ? "Sending…" : "Recover"}
                  id="reg_register"
                  className="complete"
                  disabled={!isValid || loading}
                />
              </div>
            </form>
          </div>

          <div style={{ clear: "both" }} />
        </div>
      </div>
      <div id="footer_placeholder" />
    </>
  );
}