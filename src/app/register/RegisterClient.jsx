"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from 'next-intl';
import { useAuth } from "@/hooks/auth";
import { API_URL, setToken } from "@/lib/config";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/;

export default function RegisterClient() {
  const t = useTranslations('register');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signUp, loadUser } = useAuth();

  const [username, setUsername] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [email, setEmail] = useState("");

  const [errUsername, setErrUsername] = useState(false);
  const [errPassword, setErrPassword] = useState(false);
  const [errPasswordMatch, setErrPasswordMatch] = useState(false);
  const [errEmail, setErrEmail] = useState(false);
  const [errGeneral, setErrGeneral] = useState("");
  const [submitDisabled, setSubmitDisabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // After successful signup, show the "check your email" screen
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  // Email verification via ?code= param
  const [verifyStatus, setVerifyStatus] = useState(null); // null | "loading" | "success" | "error"
  const [verifyMessage, setVerifyMessage] = useState("");

  // On mount, check for ?code= and verify if present
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;

    setVerifyStatus("loading");
    fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          // Store the token and load the user — they're now logged in
          setToken(data.token);
          loadUser();
          setVerifyStatus("success");
          setVerifyMessage(t('verifySuccess', { defaultValue: "Your email has been verified! You can now use your account." }));
        } else {
          setVerifyStatus("error");
          setVerifyMessage(data.error || t('verifyError', { defaultValue: "Invalid or expired verification link." }));
        }
      })
      .catch(() => {
        setVerifyStatus("error");
        setVerifyMessage(t('verifyError', { defaultValue: "Something went wrong. Please try again." }));
      });
  }, []);

  useEffect(() => {
    if (!loading && user && !searchParams.get("code")) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    const usernameValid = USERNAME_PATTERN.test(username);
    setErrUsername(username.length > 0 && !usernameValid);
    setErrPassword(!password1);
    setErrEmail(!email);
    setErrPasswordMatch(password2.length > 0 && password1 !== password2);
    setSubmitDisabled(!(usernameValid && password1 && password1 === password2 && email));
  }, [username, password1, password2, email]);

  // ── Email verification screen (?code= param) ─────────────────────────────
  if (verifyStatus) {
    return (
      <div id="content_wrap">
        <div id="content">
          <div className="sn">
            <div className="content-sn registration">
              {verifyStatus === "loading" && (
                <p>{t('verifying', { defaultValue: "Verifying your email…" })}</p>
              )}
              {verifyStatus === "success" && (
                <>
                  <h1>{t('verifySuccessTitle', { defaultValue: "Email verified!" })}</h1>
                  <p style={{ margin: "16px 0 20px" }}>{verifyMessage}</p>
                  <button className="complete" onClick={() => router.push("/")}>
                    {t('continueButton', { defaultValue: "Continue to site" })}
                  </button>
                </>
              )}
              {verifyStatus === "error" && (
                <>
                  <h1>{t('verifyErrorTitle', { defaultValue: "Verification failed" })}</h1>
                  <p style={{ margin: "16px 0 20px", color: "red" }}>{verifyMessage}</p>
                  <button className="complete" onClick={() => router.push("/register")}>
                    {t('backToRegister', { defaultValue: "Back to register" })}
                  </button>
                </>
              )}
            </div>
          </div>
          <div style={{ clear: "both" }} />
        </div>
      </div>
    );
  }

  if (loading || user) return null;

  async function handleRegister() {
    if (!USERNAME_PATTERN.test(username)) {
      setErrUsername(true);
      setSubmitDisabled(true);
      return;
    }

    setIsSubmitting(true);
    setErrGeneral("");

    const { error } = await signUp(email, password1, username, t("code"));

    setIsSubmitting(false);

    if (error) {
      setErrGeneral(error);
    } else {
      // Show the "check your email" screen instead of redirecting immediately
      setRegisteredEmail(email);
      setVerificationSent(true);
    }
  }

  // ── Verification sent screen ──────────────────────────────────────────────
  if (verificationSent) {
    return (
      <div id="content_wrap">
        <div id="content">
          <div className="sn">
            <div className="content-sn registration">
              <h1>{t('verifyTitle', { defaultValue: 'Check your email' })}</h1>
              <p style={{ margin: "16px 0 8px" }}>
                {t('verifyMessage', {
                  defaultValue: "We've sent a verification link to:",
                })}
              </p>
              <p style={{ fontWeight: "bold", marginBottom: "16px" }}>{registeredEmail}</p>
              <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>
                {t('verifySubtext', {
                  defaultValue: "Click the link in the email to activate your account. It expires in 24 hours.",
                })}
              </p>
              <button
                className="complete"
                onClick={() => router.push("/")}
              >
                {t('continueButton', { defaultValue: 'Continue to site' })}
              </button>
            </div>
          </div>
          <div style={{ clear: "both" }} />
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div id="content_wrap">
      <div id="content">
        <div className="sn">
          <div className="content-sn registration">
            <h1>{t('title')}</h1>

            <label>
              <p>{t('usernameLabel')}</p>
              <input
                className="input"
                type="text"
                id="reg_username"
                maxLength={30}
                placeholder={t('usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {errUsername && <span className="error">{t('usernameError')}</span>}
            </label>

            <label>
              <p>{t('passwordLabel')}</p>
              <input
                className="input"
                type="password"
                id="reg_password1"
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
              />
              {errPassword && <span className="error">{t('passwordError')}</span>}
            </label>

            <label>
              <p>{t('repeatPasswordLabel')}</p>
              <input
                className="input"
                type="password"
                id="reg_password2"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
              {errPasswordMatch && <span className="error">{t('passwordMatchError')}</span>}
            </label>

            <label>
              <p>{t('emailLabel')}</p>
              <input
                className="input"
                type="text"
                id="reg_email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errEmail && <span className="error">{t('emailError')}</span>}
            </label>

            <div className="label">
              <p></p>
              <button
                className="complete"
                id="reg_submit"
                disabled={submitDisabled || isSubmitting}
                onClick={handleRegister}
              >
                {isSubmitting
                  ? t('registeringButton', { defaultValue: 'Registering…' })
                  : t('registerButton')}
              </button>
            </div>

            {errGeneral && (
              <div className="error" style={{ marginTop: "10px" }}>{errGeneral}</div>
            )}
          </div>
        </div>
        <div style={{ clear: "both" }} />
      </div>
    </div>
  );
}