import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faAt,
  faEnvelope,
  faLock,
  faShieldHalved,
  faFloppyDisk,
  faCheck,
  faCircleExclamation,
  faGamepad,
  faEye,
  faEyeSlash,
  faArrowLeft,
  faCamera,
  faXmark,
  faImage,
  faKey,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../api/session";
import "./../style/profile-style.css";

const API_URL = "https://gameonix-backend.vercel.app/api/auth";

const DEFAULT_AVATAR =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-All/main/0.png";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

function maskEmail(email) {
  if (!email || !email.includes("@")) return "your email";

  const [localPart, ...domainParts] = email.split("@");
  const domain = domainParts.join("@");
  const visiblePart = localPart.slice(0, 4);
  const hiddenLength = Math.max(4, localPart.length - visiblePart.length);
  const maskedPart = "*".repeat(hiddenLength);

  return `${visiblePart}${maskedPart}@${domain}`;
}

function Profile() {
  const { user, refreshUser, setUser } = useAuth();

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef("");

  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [avatarPopupOpen, setAvatarPopupOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] =
    useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    username: "",
  });

  const [emailData, setEmailData] = useState({
    email: "",
    password: "",
  });

  const [pendingEmail, setPendingEmail] = useState("");
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [emailVerificationPending, setEmailVerificationPending] =
    useState(false);

  // Password reset state: the user enters the email manually.
  const [resetData, setResetData] = useState({
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
  });

  const [resetCodeSent, setResetCodeSent] = useState(false);

  useEffect(() => {
    setProfileData({
      name: user?.name || "",
      username: user?.username || "",
    });

    setEmailData((previous) => ({
      ...previous,
      email: user?.email || "",
    }));
  }, [user?.name, user?.username, user?.email]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function showFeedback(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  function clearFeedback() {
    setMessage("");
  }

  async function sendRequest(endpoint, body) {
    const response = await authFetch(`${API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Something went wrong."
      );
    }

    return data;
  }

  function openAvatarPopup() {
    setAvatarError("");
    setSelectedFile(null);

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = "";
    setPreviewUrl("");
    setAvatarPopupOpen(true);
  }

  function closeAvatarPopup() {
    if (isSaving) return;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = "";
    setSelectedFile(null);
    setPreviewUrl("");
    setAvatarError("");
    setAvatarPopupOpen(false);
  }

  function handleAvatarSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError("Choose a JPG, PNG, WEBP, GIF, or AVIF image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("The image must be 2 MB or smaller.");
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;

    setSelectedFile(file);
    setPreviewUrl(nextPreviewUrl);
    setAvatarError("");
  }

  async function handleAvatarSave() {
    if (!selectedFile || isSaving) return;

    setIsSaving(true);
    setAvatarError("");
    clearFeedback();

    try {
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const result = String(reader.result || "");
          const base64 = result.split(",")[1];

          if (!base64) {
            reject(new Error("Unable to read the selected image."));
            return;
          }

          resolve(base64);
        };

        reader.onerror = () =>
          reject(new Error("Unable to read the selected image."));

        reader.readAsDataURL(selectedFile);
      });

      const data = await sendRequest("upload-avatar", {
        imageData,
        mimeType: selectedFile.type,
      });

      if (data.user) {
        setUser(data.user);
      } else {
        await refreshUser();
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      previewUrlRef.current = "";
      setSelectedFile(null);
      setPreviewUrl("");
      setAvatarPopupOpen(false);

      showFeedback(
        data.message || "Profile picture updated successfully."
      );
    } catch (error) {
      setAvatarError(error.message || "Unable to upload the image.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    clearFeedback();

    const name = profileData.name.trim();
    const username = profileData.username.trim();

    if (!name || !username) {
      showFeedback("Please fill in your name and username.", "error");
      return;
    }

    if (
      username.length < 3 ||
      username.length > 24 ||
      !/^[a-zA-Z0-9_]+$/.test(username)
    ) {
      showFeedback(
        "Username must be 3–24 characters and use English letters, numbers, and underscores only.",
        "error"
      );
      return;
    }

    setIsSaving(true);

    try {
      const data = await sendRequest("update-profile", {
        name,
        username,
      });

      if (data.user) {
        setUser(data.user);
      } else {
        await refreshUser();
      }

      showFeedback(data.message || "Profile updated successfully.");
    } catch (error) {
      showFeedback(
        error.message || "Unable to update your profile.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEmailSave(event) {
    event.preventDefault();
    clearFeedback();

    const email = emailData.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback("Please enter a valid email address.", "error");
      return;
    }

    if (!emailData.password) {
      showFeedback(
        "Enter your current password to change your email.",
        "error"
      );
      return;
    }

    if (
      email === String(user?.email || "").trim().toLowerCase()
    ) {
      showFeedback(
        "This is already your current email address.",
        "error"
      );
      return;
    }

    setIsSaving(true);

    try {
      const data = await sendRequest("change-email", {
        email,
        password: emailData.password,
      });

      setPendingEmail(email);
      setEmailVerificationCode("");
      setEmailVerificationPending(true);

      setEmailData((previous) => ({
        ...previous,
        password: "",
      }));

      showFeedback(
        data.message ||
        "A verification code has been sent to your new email address."
      );
    } catch (error) {
      showFeedback(
        error.message || "Unable to start the email change.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEmailVerification(event) {
    event.preventDefault();
    clearFeedback();

    const code = emailVerificationCode.trim();

    if (!/^\d{6}$/.test(code)) {
      showFeedback("Enter the six-digit verification code.", "error");
      return;
    }

    setIsSaving(true);

    try {
      const data = await sendRequest("verify-email-change", { code });

      if (data.user) {
        setUser(data.user);
      } else {
        await refreshUser();
      }

      setEmailVerificationPending(false);
      setPendingEmail("");
      setEmailVerificationCode("");

      setEmailData({
        email: data.user?.email || pendingEmail,
        password: "",
      });

      showFeedback(
        data.message ||
        "Your email address has been updated successfully."
      );
    } catch (error) {
      showFeedback(
        error.message || "Unable to verify your new email.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  }

  function cancelEmailVerification() {
    setEmailVerificationPending(false);
    setPendingEmail("");
    setEmailVerificationCode("");

    setEmailData({
      email: user?.email || "",
      password: "",
    });

    clearFeedback();
  }

  // Send a password reset code to the email entered by the user.
  async function handleSendResetCode(event) {
    event.preventDefault();
    clearFeedback();

    const email = resetData.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback("Please enter a valid email address.", "error");
      return;
    }

    setIsSaving(true);

    try {
      const data = await sendRequest("forgot-password", {
        email,
      });

      setResetData((previous) => ({
        ...previous,
        email,
        code: "",
        password: "",
        confirmPassword: "",
      }));

      setResetCodeSent(true);

      showFeedback(
        data.message ||
        "If an eligible account exists, a reset code will be sent to its email.",
        "success"
      );
    } catch (error) {
      showFeedback(
        error.message || "Unable to send the reset code.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  }

  // Verify the reset code and save the new password.
  async function handleResetPassword(event) {
    event.preventDefault();
    clearFeedback();

    const email = resetData.email.trim().toLowerCase();
    const code = resetData.code.trim();
    const password = resetData.password;
    const confirmPassword = resetData.confirmPassword;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback("Please enter a valid email address.", "error");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      showFeedback("Enter the six-digit reset code.", "error");
      return;
    }

    if (
      password.length < 8 ||
      new TextEncoder().encode(password).length > 72
    ) {
      showFeedback(
        "Your new password must be at least 8 characters and no more than 72 UTF-8 bytes.",
        "error"
      );
      return;
    }

    if (password !== confirmPassword) {
      showFeedback("The new passwords do not match.", "error");
      return;
    }

    setIsSaving(true);

    try {
      const data = await sendRequest("reset-password", {
        email,
        code,
        password,
        confirmPassword,
      });

      setResetData({
        email: "",
        code: "",
        password: "",
        confirmPassword: "",
      });

      setResetCodeSent(false);
      setShowResetPassword(false);
      setShowResetConfirmPassword(false);

      showFeedback(
        data.message || "Password reset successfully.",
        "success"
      );
    } catch (error) {
      showFeedback(
        error.message || "Unable to reset your password.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResendResetCode() {
    clearFeedback();

    const email = resetData.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback("Please enter a valid email address.", "error");
      return;
    }

    setIsSaving(true);

    try {
      const data = await sendRequest("forgot-password", {
        email,
      });

      setResetData((previous) => ({
        ...previous,
        email,
        code: "",
      }));

      showFeedback(
        data.message ||
        "If an eligible account exists, a new reset code will be sent.",
        "success"
      );
    } catch (error) {
      showFeedback(
        error.message || "Unable to resend the reset code.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleBackToResetEmail() {
    setResetCodeSent(false);

    // Keep the email the user entered instead of filling it from the account.
    setResetData((previous) => ({
      ...previous,
      code: "",
      password: "",
      confirmPassword: "",
    }));

    setShowResetPassword(false);
    setShowResetConfirmPassword(false);

    clearFeedback();
  }

  const avatarUrl = user?.avatar || DEFAULT_AVATAR;

  return (
    <main className="profile-page">
      <div className="profile-content">
        <header className="profile-page-header">
          <div>
            <div className="profile-breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              <span>Profile</span>
            </div>

            <p className="profile-eyebrow">
              <FontAwesomeIcon icon={faGamepad} />
              YOUR GAMEONIX IDENTITY
            </p>

            <h1>
              Account <span>Settings</span>
            </h1>

            <p className="profile-page-description">
              Manage your profile, email address, and account security.
            </p>
          </div>
        </header>

        <section className="profile-hero">
          <button
            type="button"
            className="profile-avatar"
            onClick={openAvatarPopup}
            title="Change profile picture"
            aria-label="Change profile picture"
            disabled={isSaving}
            style={{
              padding: 0,
              border: 0,
              overflow: "hidden",
              position: "relative",
              cursor: "pointer",
              background: "transparent",
            }}
          >
            <img
              src={avatarUrl}
              alt={`${user?.name || user?.username || "User"} profile`}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = DEFAULT_AVATAR;
              }}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "inherit",
              }}
            />

            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,.45)",
                color: "#fff",
                opacity: 0,
              }}
              className="profile-avatar-hover"
            >
              <FontAwesomeIcon icon={faCamera} />
            </span>
          </button>

          <div className="profile-hero-info">
            <span className="profile-account-label">
              <FontAwesomeIcon icon={faShieldHalved} />
              YOUR ACCOUNT
            </span>

            <h2>
              {user?.name || user?.username || "GameOnix Player"}
            </h2>

            <p>@{user?.username || "username"}</p>

            <span className="profile-email-preview">
              <FontAwesomeIcon icon={faEnvelope} />
              {user?.email ? maskEmail(user.email) : "No email available"}
            </span>

            <button
              type="button"
              className="profile-back-home"
              onClick={openAvatarPopup}
              style={{ marginTop: 12 }}
            >
              <FontAwesomeIcon icon={faCamera} />
              Change picture
            </button>
          </div>

          <div className="profile-member-badge">
            <span className="profile-status-dot" />
            Account settings
          </div>
        </section>

        {message && (
          <div
            className={`profile-message profile-message-${messageType}`}
            role={messageType === "error" ? "alert" : "status"}
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

        <div className="profile-layout">
          <aside className="profile-settings-nav">
            <p className="profile-nav-heading">SETTINGS</p>

            <button
              type="button"
              className={`profile-nav-item ${activeTab === "profile" ? "active" : ""
                }`}
              onClick={() => {
                setActiveTab("profile");
                clearFeedback();
              }}
            >
              <span className="profile-nav-icon">
                <FontAwesomeIcon icon={faUser} />
              </span>

              <span className="profile-nav-copy">
                <strong>Personal Profile</strong>
                <small>Name and username</small>
              </span>
            </button>

            <button
              type="button"
              className={`profile-nav-item ${activeTab === "email" ? "active" : ""
                }`}
              onClick={() => {
                setActiveTab("email");
                clearFeedback();
              }}
            >
              <span className="profile-nav-icon">
                <FontAwesomeIcon icon={faEnvelope} />
              </span>

              <span className="profile-nav-copy">
                <strong>Email Address</strong>
                <small>Manage your email</small>
              </span>
            </button>

            <button
              type="button"
              className={`profile-nav-item ${activeTab === "security" ? "active" : ""
                }`}
              onClick={() => {
                setActiveTab("security");
                clearFeedback();
              }}
            >
              <span className="profile-nav-icon">
                <FontAwesomeIcon icon={faLock} />
              </span>

              <span className="profile-nav-copy">
                <strong>Password &amp; Security</strong>
                <small>Protect your account</small>
              </span>
            </button>

            <div className="profile-nav-divider" />

            <Link to="/" className="profile-back-home">
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to Home
            </Link>
          </aside>

          <section className="profile-settings-panel">
            {activeTab === "profile" && (
              <form onSubmit={handleProfileSave}>
                <div className="profile-panel-heading">
                  <span className="profile-panel-icon">
                    <FontAwesomeIcon icon={faUser} />
                  </span>

                  <div>
                    <h3>Personal Profile</h3>
                    <p>Update how you appear across GameOnix.</p>
                  </div>
                </div>

                <div className="profile-form-grid">
                  <div className="profile-field profile-field-full">
                    <label htmlFor="profile-name">Display name</label>

                    <div className="profile-input-wrap">
                      <FontAwesomeIcon icon={faUser} />

                      <input
                        id="profile-name"
                        type="text"
                        autoComplete="name"
                        maxLength={80}
                        value={profileData.name}
                        onChange={(event) => {
                          setProfileData((previous) => ({
                            ...previous,
                            name: event.target.value,
                          }));
                          clearFeedback();
                        }}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="profile-field profile-field-full">
                    <label htmlFor="profile-username">Username</label>

                    <div className="profile-input-wrap">
                      <FontAwesomeIcon icon={faAt} />

                      <input
                        id="profile-username"
                        type="text"
                        autoComplete="username"
                        minLength={3}
                        maxLength={24}
                        pattern="[a-zA-Z0-9_]+"
                        title="Use 3–24 English letters, numbers, or underscores."
                        value={profileData.username}
                        onChange={(event) => {
                          setProfileData((previous) => ({
                            ...previous,
                            username: event.target.value,
                          }));
                          clearFeedback();
                        }}
                        placeholder="Choose a username"
                        required
                      />
                    </div>

                    <small>
                      3–24 characters: English letters, numbers, and underscores.
                    </small>
                  </div>
                </div>

                <div className="profile-form-footer">
                  <p>Your username may be visible to other players.</p>

                  <button
                    className="profile-save-button"
                    type="submit"
                    disabled={isSaving}
                  >
                    <FontAwesomeIcon icon={faFloppyDisk} />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "email" && (
              <>
                <div className="profile-panel-heading">
                  <span className="profile-panel-icon">
                    <FontAwesomeIcon icon={faEnvelope} />
                  </span>

                  <div>
                    <h3>Email Address</h3>
                    <p>Manage the email associated with your account.</p>
                  </div>
                </div>

                {!emailVerificationPending ? (
                  <form onSubmit={handleEmailSave}>
                    <div className="profile-security-note">
                      <FontAwesomeIcon icon={faShieldHalved} />

                      <p>
                        Enter your new email address and current password.
                        Your existing email stays active until the new address is verified.
                      </p>
                    </div>

                    <div className="profile-field">
                      <label htmlFor="profile-email">
                        New email address
                      </label>

                      <div className="profile-input-wrap">
                        <FontAwesomeIcon icon={faEnvelope} />

                        <input
                          id="profile-email"
                          type="email"
                          autoComplete="email"
                          maxLength={254}
                          value={emailData.email}
                          onChange={(event) => {
                            setEmailData((previous) => ({
                              ...previous,
                              email: event.target.value,
                            }));
                            clearFeedback();
                          }}
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="profile-field">
                      <label htmlFor="email-current-password">
                        Current password
                      </label>

                      <div className="profile-input-wrap">
                        <FontAwesomeIcon icon={faLock} />

                        <input
                          id="email-current-password"
                          type="password"
                          autoComplete="current-password"
                          value={emailData.password}
                          onChange={(event) => {
                            setEmailData((previous) => ({
                              ...previous,
                              password: event.target.value,
                            }));
                            clearFeedback();
                          }}
                          placeholder="Confirm your current password"
                          required
                        />
                      </div>
                    </div>

                    <div className="profile-form-footer">
                      <p>Use an email address you can access.</p>

                      <button
                        className="profile-save-button"
                        type="submit"
                        disabled={isSaving}
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} />
                        {isSaving
                          ? "Sending code..."
                          : "Send Verification Code"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleEmailVerification}>
                    <div className="profile-security-note">
                      <FontAwesomeIcon icon={faShieldHalved} />

                      <p>
                        We sent a six-digit verification code to{" "}
                        <strong>{pendingEmail}</strong>. Enter it below to
                        confirm your new email address.
                      </p>
                    </div>

                    <div className="profile-field">
                      <label htmlFor="email-verification-code">
                        Verification code
                      </label>

                      <div className="profile-input-wrap">
                        <FontAwesomeIcon icon={faCheck} />

                        <input
                          id="email-verification-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          minLength={6}
                          maxLength={6}
                          value={emailVerificationCode}
                          onChange={(event) => {
                            setEmailVerificationCode(
                              event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6)
                            );
                            clearFeedback();
                          }}
                          placeholder="Enter 6-digit code"
                          required
                        />
                      </div>
                    </div>

                    <div className="profile-form-footer">
                      <button
                        className="profile-back-home"
                        type="button"
                        disabled={isSaving}
                        onClick={cancelEmailVerification}
                      >
                        Cancel
                      </button>

                      <button
                        className="profile-save-button"
                        type="submit"
                        disabled={
                          isSaving || emailVerificationCode.length !== 6
                        }
                      >
                        <FontAwesomeIcon icon={faCheck} />
                        {isSaving ? "Verifying..." : "Verify New Email"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {activeTab === "security" && (
              <div>
                <div className="profile-panel-heading">
                  <span className="profile-panel-icon">
                    <FontAwesomeIcon icon={faLock} />
                  </span>

                  <div>
                    <h3>Password &amp; Security</h3>
                    <p>
                      Reset your password securely using your email address.
                    </p>
                  </div>
                </div>

                <div className="profile-security-note">
                  <FontAwesomeIcon icon={faShieldHalved} />

                  <p>
                    Enter your account email, verify the code we send you,
                    and choose a new password.
                  </p>
                </div>

                {!resetCodeSent ? (
                  <form onSubmit={handleSendResetCode}>
                    <div className="profile-field">
                      <label htmlFor="reset-account-email">
                        Account email address
                      </label>

                      <div className="profile-input-wrap">
                        <FontAwesomeIcon icon={faEnvelope} />

                        <input
                          id="reset-account-email"
                          type="email"
                          autoComplete="email"
                          maxLength={254}
                          value={resetData.email}
                          onChange={(event) => {
                            setResetData((previous) => ({
                              ...previous,
                              email: event.target.value,
                            }));
                            clearFeedback();
                          }}
                          placeholder="Enter your account email"
                          required
                        />
                      </div>
                    </div>

                    <div className="profile-form-footer">
                      <p>
                        A six-digit reset code will be sent to your email.
                      </p>

                      <button
                        className="profile-save-button"
                        type="submit"
                        disabled={isSaving}
                      >
                        <FontAwesomeIcon icon={faEnvelope} />
                        {isSaving ? "Sending code..." : "Send Reset Code"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword}>
                    <div className="profile-security-note">
                      <FontAwesomeIcon icon={faEnvelope} />

                      <p>
                        Enter the six-digit code sent to{" "}
                        <strong>{maskEmail(resetData.email)}</strong>, then
                        choose your new password.
                      </p>
                    </div>

                    <div className="profile-field">
                      <label htmlFor="password-reset-code">
                        Six-digit verification code
                      </label>

                      <div className="profile-input-wrap">
                        <FontAwesomeIcon icon={faKey} />

                        <input
                          id="password-reset-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          minLength={6}
                          maxLength={6}
                          value={resetData.code}
                          onChange={(event) => {
                            setResetData((previous) => ({
                              ...previous,
                              code: event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6),
                            }));
                            clearFeedback();
                          }}
                          placeholder="Enter 6-digit code"
                          required
                        />
                      </div>
                    </div>

                    <div className="profile-field">
                      <label htmlFor="password-reset-new">
                        New password
                      </label>

                      <div className="profile-input-wrap">
                        <FontAwesomeIcon icon={faLock} />

                        <input
                          id="password-reset-new"
                          type={showResetPassword ? "text" : "password"}
                          autoComplete="new-password"
                          minLength={8}
                          value={resetData.password}
                          onChange={(event) => {
                            setResetData((previous) => ({
                              ...previous,
                              password: event.target.value,
                            }));
                            clearFeedback();
                          }}
                          placeholder="Enter your new password"
                          required
                        />

                        <button
                          type="button"
                          className="profile-password-toggle"
                          onClick={() =>
                            setShowResetPassword((value) => !value)
                          }
                          aria-label={
                            showResetPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          <FontAwesomeIcon
                            icon={
                              showResetPassword ? faEyeSlash : faEye
                            }
                          />
                        </button>
                      </div>
                    </div>

                    <div className="profile-field">
                      <label htmlFor="password-reset-confirm">
                        Confirm new password
                      </label>

                      <div className="profile-input-wrap">
                        <FontAwesomeIcon icon={faLock} />

                        <input
                          id="password-reset-confirm"
                          type={
                            showResetConfirmPassword ? "text" : "password"
                          }
                          autoComplete="new-password"
                          minLength={8}
                          value={resetData.confirmPassword}
                          onChange={(event) => {
                            setResetData((previous) => ({
                              ...previous,
                              confirmPassword: event.target.value,
                            }));
                            clearFeedback();
                          }}
                          placeholder="Repeat your new password"
                          required
                        />

                        <button
                          type="button"
                          className="profile-password-toggle"
                          onClick={() =>
                            setShowResetConfirmPassword((value) => !value)
                          }
                          aria-label={
                            showResetConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          <FontAwesomeIcon
                            icon={
                              showResetConfirmPassword
                                ? faEyeSlash
                                : faEye
                            }
                          />
                        </button>
                      </div>
                    </div>

                    <div className="profile-form-footer">
                      <button
                        className="profile-back-home"
                        type="button"
                        disabled={isSaving}
                        onClick={handleBackToResetEmail}
                      >
                        <FontAwesomeIcon icon={faArrowLeft} />
                        Back
                      </button>

                      <button
                        className="profile-save-button"
                        type="submit"
                        disabled={isSaving}
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} />
                        {isSaving
                          ? "Resetting..."
                          : "Confirm New Password"}
                      </button>
                    </div>

                    <button
                      type="button"
                      className="profile-back-home"
                      disabled={isSaving}
                      onClick={handleResendResetCode}
                    >
                      Resend reset code
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {avatarPopupOpen && (
        <div
          className="avatar-popup-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAvatarPopup();
            }
          }}
        >
          <section
            className="avatar-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-popup-title"
          >
            <button
              type="button"
              className="avatar-popup-close"
              onClick={closeAvatarPopup}
              disabled={isSaving}
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>

            <div className="avatar-popup-heading-icon">
              <FontAwesomeIcon icon={faCamera} />
            </div>

            <h2 id="avatar-popup-title">Change profile picture</h2>

            <p>
              Choose a picture to use across your GameOnix account.
            </p>

            <div className="avatar-popup-preview">
              <img
                src={previewUrl || avatarUrl}
                alt="Profile picture preview"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={handleAvatarSelect}
              hidden
            />

            <button
              type="button"
              className="avatar-popup-choose"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving}
            >
              <FontAwesomeIcon icon={faImage} />
              {selectedFile ? "Choose another image" : "Choose image"}
            </button>

            <p className="avatar-popup-hint">
              JPG, PNG, WEBP, GIF, or AVIF · Maximum 2 MB
            </p>

            {selectedFile && (
              <p className="avatar-popup-filename">
                {selectedFile.name}
              </p>
            )}

            {avatarError && (
              <p className="avatar-popup-error" role="alert">
                {avatarError}
              </p>
            )}

            <div className="avatar-popup-actions">
              <button
                type="button"
                className="avatar-popup-cancel"
                onClick={closeAvatarPopup}
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="avatar-popup-save"
                onClick={handleAvatarSave}
                disabled={!selectedFile || isSaving}
              >
                <FontAwesomeIcon icon={faFloppyDisk} />
                {isSaving ? "Uploading..." : "Save picture"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Profile;