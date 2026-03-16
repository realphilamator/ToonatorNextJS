"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { db } from "@/lib/config";
import { useAuth } from "@/hooks/auth";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/;

export default function RegisterClient() {
  const t = useTranslations('register');
  const router = useRouter();

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

  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const usernameValid = USERNAME_PATTERN.test(username);
    setErrUsername(username.length > 0 && !usernameValid);
    setErrPassword(!password1);
    setErrEmail(!email);
    setErrPasswordMatch(password2.length > 0 && password1 !== password2);

    const valid = usernameValid && password1 && password1 === password2 && email;
    setSubmitDisabled(!valid);
  }, [username, password1, password2, email]);

  if (loading || user) return null;

  async function handleRegister() {
    if (!USERNAME_PATTERN.test(username)) {
      setErrUsername(true);
      setSubmitDisabled(true);
      return;
    }

    const { error } = await db.auth.signUp({
      email,
      password: password1,
      options: { data: { username } },
    });

    if (error) {
      setErrGeneral(error.message);
    } else {
      router.push("/");
    }
  }

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
              {errUsername && (
                <span className="error">{t('usernameError')}</span>
              )}
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
              {errPasswordMatch && (
                <span className="error">{t('passwordMatchError')}</span>
              )}
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
                disabled={submitDisabled}
                onClick={handleRegister}
              >
                {t('registerButton')}
              </button>
            </div>

            {errGeneral && (
              <div className="error" style={{ marginTop: "10px" }}>
                {errGeneral}
              </div>
            )}
          </div>
        </div>
        <div style={{ clear: "both" }} />
      </div>
    </div>
  );
}