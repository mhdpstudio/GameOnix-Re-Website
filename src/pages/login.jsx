import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGamepad,
  faEnvelope,
  faLock,
  faUser,
  faEye,
  faEyeSlash,
  faArrowRight,
  faCheck,
  faCircleExclamation,
  faShieldHalved,
  faKey,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

import Loader from "../widgets/components/Loader";
import { useAuth } from "../context/AuthContext";
import "./../style/login-style.css";

const API_URL = "https://gameonix-backend.vercel.app/api/auth";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [isSwitchingLoading, setIsSwitchingLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginData, setLoginData] = useState({
    identity: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [verification, setVerification] = useState({
    email: "",
    code: "",
  });

  const [resetData, setResetData] = useState({
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
  });

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isVerify = mode === "verify";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";

  function showFeedback(text, type = "error") {
    setMessage(text);
    setMessageType(type);
  }

  function switchMode(nextMode) {
    if (mode === nextMode || isSubmitting) return;

    setIsSwitchingLoading(true);
    setMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);

    setTimeout(() => {
      setMode(nextMode);
      setIsSwitchingLoading(false);
    }, 300);
  }

  function handleLoginChange(event) {
    const { name, value } = event.target;

    setLoginData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  }

  function handleRegisterChange(event) {
    const { name, value, type, checked } = event.target;

    setRegisterData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setMessage("");
  }

  function handleVerificationChange(event) {
    const { name, value } = event.target;

    setVerification((previous) => ({
      ...previous,
      [name]:
        name === "code"
          ? value.replace(/\D/g, "").slice(0, 6)
          : value,
    }));

    setMessage("");
  }

  function handleResetChange(event) {
    const { name, value } = event.target;

    setResetData((previous) => ({
      ...previous,
      [name]:
        name === "code"
          ? value.replace(/\D/g, "").slice(0, 6)
          : value,
    }));

    setMessage("");
  }

  async function postJson(endpoint, body) {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.error ||
        data.message ||
        "The request failed. Please try again."
      );

      error.status = response.status;
      error.data = data;

      throw error;
    }

    return data;
  }


  async function handleLoginSubmit(event) {
    event.preventDefault();

    if (!loginData.identity.trim() || !loginData.password) {
      showFeedback("Enter your email or username and password.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const data = await postJson("login", {
        identity: loginData.identity.trim(),
        password: loginData.password,
        rememberMe,
      });

      if (!data.sessionToken) {
        throw new Error(
          "The server did not create a persistent session. Please update the backend and try again."
        );
      }

      login(data.user, data.sessionToken, rememberMe);
      navigate("/", { replace: true });
    } catch (error) {
      if (error.data?.verificationRequired) {
        setVerification({
          email: loginData.identity.includes("@")
            ? loginData.identity.trim()
            : "",
          code: "",
        });

        setMode("verify");

        showFeedback(
          "Your account needs email verification before you can sign in.",
          "info"
        );
      } else {
        showFeedback(error.message || "Unable to sign in.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }


  async function handleRegisterSubmit(event) {
    event.preventDefault();

    const name = registerData.name.trim();
    const username = registerData.username.trim();
    const email = registerData.email.trim().toLowerCase();

    if (
      !name ||
      !username ||
      !email ||
      !registerData.password ||
      !registerData.confirmPassword
    ) {
      showFeedback("Please fill in all required fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback("Please enter a valid email address.");
      return;
    }

    if (
      username.length < 3 ||
      username.length > 30 ||
      !/^[a-zA-Z0-9_.-]+$/.test(username)
    ) {
      showFeedback(
        "Username must be 3–30 characters and use letters, numbers, dots, underscores, or hyphens."
      );
      return;
    }

    if (
      registerData.password.length < 8 ||
      registerData.password.length > 72
    ) {
      showFeedback("Your password must be between 8 and 72 characters.");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      showFeedback("The passwords do not match.");
      return;
    }

    if (!registerData.agree) {
      showFeedback("Please accept the Terms of Service to continue.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const data = await postJson("register", {
        name,
        username,
        email,
        password: registerData.password,
        confirmPassword: registerData.confirmPassword,
      });

      setVerification({
        email: data.email || email,
        code: "",
      });

      setMode("verify");

      showFeedback(
        data.message || "Check your email for the verification code.",
        "success"
      );
    } catch (error) {
      showFeedback(error.message || "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifySubmit(event) {
    event.preventDefault();

    const email = verification.email.trim().toLowerCase();
    const code = verification.code.trim();

    if (!email) {
      showFeedback("Enter the email address used to register.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      showFeedback("Enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const data = await postJson("verify-email", {
        email,
        code,
        rememberMe,
      });

      if (data.sessionToken) {
        login(data.user, data.sessionToken, rememberMe);
        navigate("/", { replace: true });
        return;
      }

      setLoginData((previous) => ({
        ...previous,
        identity: email,
        password: "",
      }));

      setVerification((previous) => ({
        ...previous,
        code: "",
      }));

      setMode("login");

      showFeedback(
        data.message ||
        "Email verified successfully. Your account is now active.",
        "success"
      );
    } catch (error) {
      showFeedback(error.message || "Unable to verify your email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openForgotPassword() {
    if (isSubmitting) return;

    setResetData({
      email: loginData.identity.includes("@")
        ? loginData.identity.trim().toLowerCase()
        : "",
      code: "",
      password: "",
      confirmPassword: "",
    });

    setMessage("");
    setMode("forgot");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleForgotPasswordSubmit(event) {
    event.preventDefault();

    const email = resetData.email.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const data = await postJson("forgot-password", { email });

      setResetData((previous) => ({
        ...previous,
        email,
      }));

      setMode("reset");

      showFeedback(
        data.message ||
        "If an account exists for this email, password reset instructions have been sent.",
        "success"
      );
    } catch (error) {
      showFeedback(
        error.message || "Unable to request a password reset."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPasswordSubmit(event) {
    event.preventDefault();

    const email = resetData.email.trim().toLowerCase();
    const code = resetData.code.trim();
    const password = resetData.password;
    const confirmPassword = resetData.confirmPassword;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback("Please enter a valid email address.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      showFeedback("Enter the 6-digit password reset code.");
      return;
    }

    if (password.length < 8 || password.length > 72) {
      showFeedback("Your new password must be between 8 and 72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showFeedback("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const data = await postJson("reset-password", {
        email,
        code,
        password,
        confirmPassword,
      });

      setLoginData({
        identity: email,
        password: "",
      });

      setResetData({
        email,
        code: "",
        password: "",
        confirmPassword: "",
      });

      setMode("login");

      showFeedback(
        data.message || "Password reset successfully. You can now sign in.",
        "success"
      );
    } catch (error) {
      showFeedback(error.message || "Unable to reset your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function backToRegister() {
    if (isSubmitting) return;

    setMessage("");
    setMode("register");
  }

  function backToLogin() {
    if (isSubmitting) return;

    setMessage("");
    setMode("login");
  }

  function backToForgotPassword() {
    if (isSubmitting) return;

    setMessage("");
    setMode("forgot");
  }

  const headingLabel = isLogin
    ? "WELCOME BACK"
    : isRegister
      ? "JOIN THE COMMUNITY"
      : isVerify
        ? "EMAIL VERIFICATION"
        : isForgot
          ? "ACCOUNT RECOVERY"
          : "RESET PASSWORD";

  const headingTitle = isLogin
    ? "Good to see you."
    : isRegister
      ? "Create your account."
      : isVerify
        ? "Verify your email."
        : isForgot
          ? "Forgot your password?"
          : "Choose a new password.";

  const headingDescription = isLogin
    ? "Enter your details to get back into the game."
    : isRegister
      ? "Set up your profile and start your next adventure."
      : isVerify
        ? "Enter the 6-digit code we sent to your email address."
        : isForgot
          ? "Enter your email and we'll help you recover your account."
          : "Enter the reset code from your email and choose a new password.";

  return (
    <main className="auth-page">
      <div className="auth-background-glow auth-glow-one" />
      <div className="auth-background-glow auth-glow-two" />
      <div className="auth-grid-pattern" />

      <section className="auth-container">
        <aside className="auth-showcase">
          <div className="auth-brand">
            <span className="auth-brand-icon">
              <FontAwesomeIcon icon={faGamepad} />
            </span>

            <span className="auth-brand-name">
              Game<span>Onix</span>
            </span>
          </div>

          <div className="auth-showcase-content">
            <span className="auth-eyebrow">
              <span className="auth-eyebrow-dot" />
              YOUR NEXT LEVEL STARTS HERE
            </span>

            <h1>
              Every game.
              <br />
              <span>One account.</span>
            </h1>

            <p>
              Your gaming world is waiting. Sign in to continue your journey
              or create an account to get started.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature">
                <span className="auth-feature-icon">
                  <FontAwesomeIcon icon={faGamepad} />
                </span>

                <div>
                  <strong>Your gaming universe</strong>
                  <span>Keep everything in one place.</span>
                </div>
              </div>

              <div className="auth-feature">
                <span className="auth-feature-icon">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </span>

                <div>
                  <strong>Your account, your space</strong>
                  <span>A home for your gaming identity.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-showcase-footer">
            <span className="auth-footer-status">
              <span />
              BUILT FOR GAMERS
            </span>

            <span>GAMEONIX © 2026</span>
          </div>
        </aside>

        <section
          className="auth-form-panel"
          style={{ position: "relative" }}
        >
          <Loader
            isLoading={isSwitchingLoading}
            text="Switching view..."
          />

          <div className="auth-mobile-brand">
            <span className="auth-brand-icon">
              <FontAwesomeIcon icon={faGamepad} />
            </span>

            <span className="auth-brand-name">
              Game<span>Onix</span>
            </span>
          </div>

          <div className="auth-form-content">
            {!isVerify && !isForgot && !isReset && (
              <div
                className="auth-tabs"
                role="tablist"
                aria-label="Account type"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isLogin}
                  className={`auth-tab ${isLogin ? "active" : ""}`}
                  onClick={() => switchMode("login")}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={isRegister}
                  className={`auth-tab ${isRegister ? "active" : ""}`}
                  onClick={() => switchMode("register")}
                >
                  Create Account
                </button>

                <span
                  className={`auth-tab-indicator ${isRegister ? "indicator-right" : ""
                    }`}
                />
              </div>
            )}

            <div className="auth-heading" key={mode}>
              <span className="auth-heading-label">{headingLabel}</span>
              <h2>{headingTitle}</h2>
              <p>{headingDescription}</p>
            </div>

            {message && (
              <div
                className={`auth-message auth-message-${messageType}`}
                role="status"
                aria-live="polite"
              >
                <FontAwesomeIcon
                  icon={
                    messageType === "success"
                      ? faCheck
                      : faCircleExclamation
                  }
                />
                <span>{message}</span>
              </div>
            )}

            {isLogin && (
              <form
                className="auth-form"
                onSubmit={handleLoginSubmit}
                noValidate
              >
                <div className="auth-field">
                  <label htmlFor="login-identity">Email or username</label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faUser}
                      className="auth-input-icon"
                    />

                    <input
                      id="login-identity"
                      name="identity"
                      type="text"
                      placeholder="Enter your email or username"
                      autoComplete="username"
                      value={loginData.identity}
                      onChange={handleLoginChange}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <div className="auth-label-row">
                    <label htmlFor="login-password">Password</label>

                    <button
                      type="button"
                      className="auth-text-button"
                      onClick={openForgotPassword}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="auth-input-icon"
                    />

                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      required
                    />

                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      <FontAwesomeIcon
                        icon={showPassword ? faEyeSlash : faEye}
                      />
                    </button>
                  </div>
                </div>

                <label className="auth-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                  />

                  <span className="auth-custom-check">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>

                  <span>Keep me signed in</span>
                </label>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? "Please wait..." : "Sign In"}</span>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="auth-submit-arrow"
                  />
                </button>
              </form>
            )}

            {isRegister && (
              <form
                className="auth-form auth-register-form"
                onSubmit={handleRegisterSubmit}
                noValidate
              >
                <div className="auth-field">
                  <label htmlFor="register-name">Full name</label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faUser}
                      className="auth-input-icon"
                    />

                    <input
                      id="register-name"
                      name="name"
                      type="text"
                      placeholder="Your full name"
                      autoComplete="name"
                      value={registerData.name}
                      onChange={handleRegisterChange}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="register-username">Username</label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faGamepad}
                      className="auth-input-icon"
                    />

                    <input
                      id="register-username"
                      name="username"
                      type="text"
                      placeholder="Choose a username"
                      autoComplete="username"
                      value={registerData.username}
                      onChange={handleRegisterChange}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="register-email">Email address</label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="auth-input-icon"
                    />

                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={registerData.email}
                      onChange={handleRegisterChange}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="register-password">Password</label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="auth-input-icon"
                    />

                    <input
                      id="register-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      required
                    />

                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      <FontAwesomeIcon
                        icon={showPassword ? faEyeSlash : faEye}
                      />
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="register-confirm-password">
                    Confirm password
                  </label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="auth-input-icon"
                    />

                    <input
                      id="register-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      value={registerData.confirmPassword}
                      onChange={handleRegisterChange}
                      required
                    />

                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
                    >
                      <FontAwesomeIcon
                        icon={showConfirmPassword ? faEyeSlash : faEye}
                      />
                    </button>
                  </div>
                </div>

                <label className="auth-checkbox auth-terms">
                  <input
                    type="checkbox"
                    name="agree"
                    checked={registerData.agree}
                    onChange={handleRegisterChange}
                  />

                  <span className="auth-custom-check">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>

                  <span>
                    I agree to the <a href="/terms">Terms of Service</a> and{" "}
                    <a href="/privacy">Privacy Policy</a>.
                  </span>
                </label>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={isSubmitting}
                >
                  <span>
                    {isSubmitting ? "Please wait..." : "Create Account"}
                  </span>

                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="auth-submit-arrow"
                  />
                </button>
              </form>
            )}

            {isVerify && (
              <form
                className="auth-form auth-verify-form"
                onSubmit={handleVerifySubmit}
                noValidate
              >
                <div className="auth-field">
                  <label htmlFor="verify-email">Email address</label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="auth-input-icon"
                    />

                    <input
                      id="verify-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={verification.email}
                      onChange={handleVerificationChange}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="verify-code">
                    6-digit verification code
                  </label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faShieldHalved}
                      className="auth-input-icon"
                    />

                    <input
                      id="verify-code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      value={verification.code}
                      onChange={handleVerificationChange}
                      required
                    />
                  </div>

                  <small id="verify-code-help">
                    Check your inbox and spam folder. The code expires after
                    24 hours.
                  </small>
                </div>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? "Verifying..." : "Verify Email"}</span>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="auth-submit-arrow"
                  />
                </button>

                <button
                  type="button"
                  className="auth-text-button"
                  onClick={backToRegister}
                  disabled={isSubmitting}
                >
                  Back to Create Account
                </button>
              </form>
            )}

            {isForgot && (
              <form
                className="auth-form"
                onSubmit={handleForgotPasswordSubmit}
                noValidate
              >
                <div className="auth-field">
                  <label htmlFor="forgot-email">Email address</label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="auth-input-icon"
                    />

                    <input
                      id="forgot-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={resetData.email}
                      onChange={handleResetChange}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={isSubmitting}
                >
                  <span>
                    {isSubmitting ? "Sending..." : "Send Reset Code"}
                  </span>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="auth-submit-arrow"
                  />
                </button>

                <button
                  type="button"
                  className="auth-text-button"
                  onClick={backToLogin}
                  disabled={isSubmitting}
                >
                  <FontAwesomeIcon icon={faArrowLeft} /> Back to Sign In
                </button>
              </form>
            )}

            {isReset && (
              <form
                className="auth-form"
                onSubmit={handleResetPasswordSubmit}
                noValidate
              >
                <div className="auth-field">
                  <label htmlFor="reset-email">Email address</label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="auth-input-icon"
                    />

                    <input
                      id="reset-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={resetData.email}
                      onChange={handleResetChange}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reset-code">6-digit reset code</label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faKey}
                      className="auth-input-icon"
                    />

                    <input
                      id="reset-code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      value={resetData.code}
                      onChange={handleResetChange}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reset-password">New password</label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="auth-input-icon"
                    />

                    <input
                      id="reset-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={resetData.password}
                      onChange={handleResetChange}
                      required
                    />

                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      <FontAwesomeIcon
                        icon={showPassword ? faEyeSlash : faEye}
                      />
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reset-confirm-password">
                    Confirm new password
                  </label>

                  <div className="auth-input-wrap">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="auth-input-icon"
                    />

                    <input
                      id="reset-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repeat your new password"
                      value={resetData.confirmPassword}
                      onChange={handleResetChange}
                      required
                    />

                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
                    >
                      <FontAwesomeIcon
                        icon={showConfirmPassword ? faEyeSlash : faEye}
                      />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={isSubmitting}
                >
                  <span>
                    {isSubmitting ? "Resetting..." : "Reset Password"}
                  </span>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="auth-submit-arrow"
                  />
                </button>

                <button
                  type="button"
                  className="auth-text-button"
                  onClick={backToForgotPassword}
                  disabled={isSubmitting}
                >
                  Request another code
                </button>
              </form>
            )}

            {!isVerify && !isForgot && !isReset && (
              <div className="auth-switch">
                <span>
                  {isLogin
                    ? "New to GameOnix?"
                    : "Already have an account?"}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    switchMode(isLogin ? "register" : "login")
                  }
                  disabled={isSubmitting}
                >
                  {isLogin ? "Create an account" : "Sign in"}
                </button>
              </div>
            )}

            <div className="auth-security-note">
              <FontAwesomeIcon icon={faShieldHalved} />
              <span>Your gaming journey starts here.</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default Login;