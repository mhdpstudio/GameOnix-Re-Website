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
  faCreditCard,
  faBagShopping,
  faWallet,
  faLightbulb,
  faHandPointUp,
  faBell,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "../../context/AuthContext";
import { getCommunityApiToken } from "../../api/session";

const DEFAULT_AVATAR =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-All/main/0.png";
const NOTIFICATIONS_URL =
  "https://gameonixfav.vercel.app/api/auth/wallet-notifications";
const NOTIFICATIONS_UPDATED_EVENT = "wallet-notifications-updated";

const navigation = [
  {
    section: "MENU",
    items: [
      { label: "Home", to: "/", icon: faHouse, end: true },
      { label: "Discover", to: "/discover", icon: faCompass },
      { label: "My Library", to: "/library", icon: faBookOpen },
      { label: "Request a Game", to: "/request-game", icon: faHandPointUp },
    ],
  },
  {
    section: "SHOPPING",
    items: [
      {
        label: "Game Cards",
        to: "/shopping/game-cards",
        icon: faCreditCard,
        // badge: "Coming soon",
      },
    ],
  },
  {
    section: "ACCOUNT",
    items: [
      { label: "Wallet", to: "/wallet", icon: faWallet },
      {
        label: "Notifications",
        to: "/notifications",
        icon: faBell,
        requiresAuth: true,
      },
    ],
  },
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

function LogoutPopup({ onClose, onConfirm, loggingOut, logoutError }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !loggingOut) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
  const [unreadNotifications, setUnreadNotifications] = useState({
    username: "",
    count: 0,
  });

  useEffect(() => {
    if (!user || authLoading) return undefined;

    let active = true;
    async function loadUnreadNotifications() {
      try {
        const token = await getCommunityApiToken();
        const response = await fetch(NOTIFICATIONS_URL, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "omit",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(data.notifications)) {
          throw new Error(data.error || "Unable to load unread notifications.");
        }
        if (!active) return;
        setUnreadNotifications({
          username: user.username,
          count: data.notifications.filter(
            (notification) => !notification.readAt
          ).length,
        });
      } catch (error) {
        if (active) {
          console.error("Sidebar notification count load failed:", error);
        }
      }
    }

    const initialLoad = window.setTimeout(loadUnreadNotifications, 0);
    const refreshInterval = window.setInterval(loadUnreadNotifications, 60_000);
    window.addEventListener(
      NOTIFICATIONS_UPDATED_EVENT,
      loadUnreadNotifications
    );
    return () => {
      active = false;
      window.clearTimeout(initialLoad);
      window.clearInterval(refreshInterval);
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        loadUnreadNotifications
      );
    };
  }, [authLoading, user]);

  const unreadCount =
    unreadNotifications.username === user?.username
      ? unreadNotifications.count
      : 0;
  const unreadBadgeText = unreadCount > 99 ? "+99" : String(unreadCount);

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
      <aside className={`sidebar${collapsed ? " is-collapsed" : ""}`}>
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
          {navigation.map((group) => (
            <div className="sidebar-nav-group" key={group.section}>
              {!collapsed && (
                <p className="sidebar-section-label">{group.section}</p>
              )}

              {group.items
                .filter((item) => !item.requiresAuth || user)
                .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={
                    collapsed
                      ? [
                          item.label,
                          item.to === "/notifications" && unreadCount
                            ? `${unreadCount} unread`
                            : item.badge,
                        ]
                          .filter(Boolean)
                          .join(" — ")
                      : undefined
                  }
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

                      {item.badge && (
                        <span className="sidebar-link-badge">{item.badge}</span>
                      )}

                      {item.to === "/notifications" && unreadCount > 0 && (
                        <span
                          className="sidebar-notification-badge"
                          aria-label={`${unreadCount} unread notifications`}
                        >
                          {unreadBadgeText}
                        </span>
                      )}

                      <span className="sidebar-link-indicator">
                        <FontAwesomeIcon icon={faChevronRight} />
                      </span>
                    </>
                  )}
                  {collapsed &&
                    item.to === "/notifications" &&
                    unreadCount > 0 && (
                      <span
                        className="sidebar-notification-badge"
                        aria-label={`${unreadCount} unread notifications`}
                      >
                        {unreadBadgeText}
                      </span>
                    )}
                </NavLink>
              ))}
            </div>
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
                  <span className="account-title">Loading account...</span>
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