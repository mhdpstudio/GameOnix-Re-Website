import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faHouse,
  faCompass,
  faBookOpen,
  faRightToBracket,
  faUser,
  faChevronRight,
  faArrowRightFromBracket,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "../../context/AuthContext";

const DEFAULT_AVATAR =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-All/main/0.png";

const navigation = [
  { label: "Home", to: "/", icon: faHouse, end: true },
  { label: "Discover", to: "/discover", icon: faCompass },
  { label: "My Library", to: "/library", icon: faBookOpen },
];

function UserAvatar({ user, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [user?.avatar]);

  return (
    <span
      className={`account-icon ${className}`.trim()}
      style={{
        overflow: "hidden",
        borderRadius: "50%",
        flexShrink: 0,
      }}
    >
      <img
        src={imageFailed ? DEFAULT_AVATAR : user?.avatar || DEFAULT_AVATAR}
        alt=""
        onError={() => {
          if (!imageFailed) setImageFailed(true);
        }}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "50%",
        }}
      />
    </span>
  );
}

function LogoutPopup({
  onClose,
  onConfirm,
  loggingOut,
  logoutError,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !loggingOut) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, loggingOut]);

  return createPortal(
    <div
      className="logout-popup-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loggingOut) {
          onClose();
        }
      }}
    >
      <section
        className="logout-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-popup-title"
        aria-describedby="logout-popup-description"
      >
        <button
          type="button"
          className="logout-popup-close"
          onClick={onClose}
          disabled={loggingOut}
          aria-label="Close confirmation"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <div className="logout-popup-icon">
          <FontAwesomeIcon icon={faArrowRightFromBracket} />
        </div>

        <h2 id="logout-popup-title">Sign out?</h2>

        <p id="logout-popup-description">
          Are you sure you want to sign out of your GameOnix account?
        </p>

        {logoutError && (
          <p className="logout-popup-error" role="alert">
            {logoutError}
          </p>
        )}

        <div className="logout-popup-actions">
          <button
            type="button"
            className="logout-cancel-button"
            onClick={onClose}
            disabled={loggingOut}
          >
            Cancel
          </button>

          <button
            type="button"
            className="logout-confirm-button"
            onClick={onConfirm}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

function Sidebar({ collapsed, onToggle }) {
  const { user, authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  function openLogoutPopup() {
    setLogoutError("");
    setShowLogoutPopup(true);
  }

  function closeLogoutPopup() {
    if (loggingOut) return;

    setShowLogoutPopup(false);
    setLogoutError("");
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      setShowLogoutPopup(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      setLogoutError("Couldn't sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link
            to="/"
            className="brand"
            aria-label="GameOnix home"
            title="GameOnix"
          >
            <img
              src="/logo.png"
              alt="GameOnix Logo"
              className="brand-logo"
            />

            {!collapsed && (
              <span className="brand-name">
                Game<span>Onix</span>
              </span>
            )}
          </Link>
        </div>

        <div className="sidebar-divider" />

        <nav className="sidebar-nav" aria-label="Main navigation">
          {!collapsed && (
            <p className="sidebar-section-label">MENU</p>
          )}

          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              <FontAwesomeIcon
                icon={item.icon}
                className="sidebar-link-icon"
              />

              {!collapsed && (
                <>
                  <span className="sidebar-link-label">
                    {item.label}
                  </span>

                  <span className="sidebar-link-indicator">
                    <FontAwesomeIcon icon={faChevronRight} />
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-divider" />

          {authLoading ? (
            <div className="sidebar-account-link" aria-live="polite">
              <span className="account-icon">
                <FontAwesomeIcon icon={faUser} />
              </span>

              {!collapsed && (
                <span className="account-copy">
                  <span className="account-title">
                    Loading account...
                  </span>
                </span>
              )}
            </div>
          ) : user ? (
            <div
              className={`sidebar-user-row${collapsed ? " collapsed" : ""}`}
            >
              <NavLink
                to="/profile"
                title={collapsed ? "Profile" : undefined}
                aria-label="Open profile"
                className={({ isActive }) =>
                  `sidebar-account-link sidebar-user-info${
                    isActive ? " active" : ""
                  }`
                }
              >
                <UserAvatar user={user} />

                {!collapsed && (
                  <span className="account-copy">
                    <span className="account-title">
                      {user.name || user.username}
                    </span>

                    <span className="account-subtitle">
                      @{user.username}
                    </span>
                  </span>
                )}
              </NavLink>

              <button
                type="button"
                className="sidebar-logout-button"
                onClick={openLogoutPopup}
                title="Sign out"
                aria-label="Sign out"
                disabled={loggingOut}
              >
                <FontAwesomeIcon icon={faArrowRightFromBracket} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="sidebar-account-link"
              title={collapsed ? "Sign in" : undefined}
            >
              <span className="account-icon">
                <FontAwesomeIcon icon={faUser} />
              </span>

              {!collapsed && (
                <>
                  <span className="account-copy">
                    <span className="account-title">Sign in</span>
                    <span className="account-subtitle">
                      Access your account
                    </span>
                  </span>

                  <span className="account-arrow">
                    <FontAwesomeIcon icon={faRightToBracket} />
                  </span>
                </>
              )}
            </Link>
          )}
        </div>
      </aside>

      {showLogoutPopup && (
        <LogoutPopup
          onClose={closeLogoutPopup}
          onConfirm={handleLogout}
          loggingOut={loggingOut}
          logoutError={logoutError}
        />
      )}
    </>
  );
}

export default Sidebar;