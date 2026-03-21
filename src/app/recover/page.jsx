"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, API_URL } from "@/lib/config";
import Includes from "@/components/Includes";

export default function RecoverPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/");
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    setMessage("");

    if (!email.trim() && !username.trim()) {
      setStatus("error");
      setMessage("Please enter your username or e-mail.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined, username: username.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
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
                <input type="text" id="reg_username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} autoComplete="username" />
              </div>
              <div>
                <label htmlFor="reg_email">E-mail:</label>
                <input type="text" id="reg_email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} autoComplete="email" />
              </div>
              {status && (
                <div style={{ marginLeft: "100px", marginBottom: "8px", color: status === "success" ? "green" : "red" }}>
                  {message}
                </div>
              )}
              <div>
                <input style={{ marginLeft: "100px" }} type="submit" value={loading ? "Sending…" : "Recover"} id="reg_register" className="complete" disabled={!isValid || loading} />
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