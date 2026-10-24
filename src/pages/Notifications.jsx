import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faCheckDouble,
  faChevronDown,
  faCircleCheck,
  faGamepad,
  faMobileScreenButton,
  faRotateRight,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import {
  faPlaystation,
  faWindows,
  faXbox,
} from "@fortawesome/free-brands-svg-icons";

import { getCommunityApiToken } from "../api/session";
import { useAuth } from "../context/AuthContext";
import "./../style/notifications-style.css";

const NOTIFICATIONS_URL =
  "https://gameonixfav.vercel.app/api/auth/wallet-notifications";

function getNotificationIcon(platform) {
  const normalized = String(platform || "").toLowerCase();
  if (
    normalized === "ps" ||
    normalized.includes("playstation") ||
    /^ps(?:\s|[0-9])/.test(normalized)
  ) {
    return faPlaystation;
  }
  if (normalized.includes("xbox")) return faXbox;
  if (["pc", "windows", "computer"].includes(normalized)) return faWindows;
  if (normalized.includes("mobile") || normalized.includes("android")) {
    return faMobileScreenButton;
  }
  return faGamepad;
}

function getDetails(notification) {
  const details = notification.details;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }

  const preferredLabels = {
    gameTitle: "Game",
    gameName: "Game",
    gameType: "Genre",
    platform: "Platform",
    version: "Version",
    fileType: "Download type",
    size: "Game size",
    publisher: "Publisher",
    username: "Username",
    email: "Account email",
    description: "Reported issue",
    report: "Reported issue",
    reply: "Team reply",
    paymentMethod: "Payment method",
    amount: "Amount",
    status: "Status",
    requestId: "Request ID",
  };

  return Object.entries(details)
    .filter(([key, value]) => {
      return (
        key !== "gameIcon" &&
        key !== "gameLink" &&
        !(key === "gameName" && details.gameTitle) &&
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      );
    })
    .map(([key, value]) => ({
      label:
        preferredLabels[key] ||
        key.replace(/([A-Z])/g, " $1").replace(/^./, (character) =>
          character.toUpperCase()
        ),
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
      long: ["description", "report", "reply"].includes(key),
    }));
}

function Notifications() {
  const { user, authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all");

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  );
  const visibleNotifications = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((notification) => !notification.readAt)
        : notifications,
    [filter, notifications]
  );

  const loadNotifications = useCallback(async ({ refresh = false } = {}) => {
    if (!user) return;
    if (refresh) {
      setLoading(true);
      setError("");
    }
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
        throw new Error(data.error || "Unable to load your notifications.");
      }
      setNotifications(data.notifications);
    } catch (loadError) {
      console.error("Notifications page load failed:", loadError);
      setError(loadError.message || "Unable to load your notifications.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const timeout = window.setTimeout(() => {
      loadNotifications();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [user, loadNotifications]);

  async function updateNotifications(method, body) {
    setActionLoading(true);
    setError("");
    try {
      const token = await getCommunityApiToken();
      const response = await fetch(NOTIFICATIONS_URL, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "omit",
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update notifications.");
      }
      return data;
    } catch (updateError) {
      console.error("Notifications page update failed:", updateError);
      setError(updateError.message || "Unable to update notifications.");
      return null;
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleNotification(notification) {
    if (expandedId === notification.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(notification.id);
    if (notification.readAt) return;

    const result = await updateNotifications("POST", {
      notificationId: notification.id,
    });
    if (result) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      );
    }
  }

  async function markAllRead() {
    if (!unreadCount) return;
    const result = await updateNotifications("POST", { markAll: true });
    if (result) {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt || readAt }))
      );
    }
  }

  async function deleteNotification(notificationId) {
    const result = await updateNotifications("DELETE", { notificationId });
    if (result) {
      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId)
      );
      setExpandedId((current) => (current === notificationId ? null : current));
    }
  }

  async function deleteAll() {
    if (
      !notifications.length ||
      !window.confirm("Delete all notifications? This cannot be undone.")
    ) {
      return;
    }
    const result = await updateNotifications("DELETE", { deleteAll: true });
    if (result) {
      setNotifications([]);
      setExpandedId(null);
    }
  }

  if (authLoading) {
    return (
      <main className="notifications-page">
        <div className="notifications-state">Checking your account...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="notifications-page">
        <section className="notifications-access-card">
          <span className="notifications-hero-icon">
            <FontAwesomeIcon icon={faBell} />
          </span>
          <h1>Notifications</h1>
          <p>Sign in to view your private GameOnix notifications.</p>
          <Link to="/login">Sign in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="notifications-page">
      <header className="notifications-header">
        <div>
          <span className="notifications-kicker">YOUR ACTIVITY</span>
          <h1>Notifications</h1>
          <p>
            Game updates, support replies, and account activity — all in one
            place.
          </p>
        </div>
        <div className="notifications-header-actions">
          <button
            type="button"
            onClick={markAllRead}
            disabled={actionLoading || unreadCount === 0}
          >
            <FontAwesomeIcon icon={faCheckDouble} />
            Mark all read
          </button>
          <button
            type="button"
            className="notifications-delete-all"
            onClick={deleteAll}
            disabled={actionLoading || notifications.length === 0}
          >
            <FontAwesomeIcon icon={faTrashCan} />
            Clear all
          </button>
        </div>
      </header>

      <section className="notifications-board" aria-label="Your notifications">
        <div className="notifications-toolbar">
          <div className="notifications-filters" aria-label="Filter notifications">
            <button
              type="button"
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              All <span>{notifications.length}</span>
            </button>
            <button
              type="button"
              className={filter === "unread" ? "active" : ""}
              onClick={() => setFilter("unread")}
            >
              Unread <span>{unreadCount}</span>
            </button>
          </div>
          <button
            className="notifications-refresh"
            type="button"
            onClick={() => loadNotifications({ refresh: true })}
            disabled={loading || actionLoading}
          >
            <FontAwesomeIcon icon={faRotateRight} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="notifications-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadNotifications({ refresh: true })}
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="notifications-state">Loading notifications...</div>
        ) : visibleNotifications.length === 0 ? (
          <div className="notifications-empty">
            <span className="notifications-hero-icon">
              <FontAwesomeIcon icon={faBell} />
            </span>
            <strong>
              {filter === "unread" ? "You’re all caught up" : "No notifications yet"}
            </strong>
            <p>
              {filter === "unread"
                ? "There are no unread updates right now."
                : "Game reports, team replies, and account updates will appear here."}
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {visibleNotifications.map((notification) => {
              const details = notification.details || {};
              const expanded = expandedId === notification.id;
              const rows = getDetails(notification);
              return (
                <article
                  className={`notifications-card${notification.readAt ? "" : " unread"}${expanded ? " expanded" : ""}`}
                  key={notification.id}
                >
                  <button
                    type="button"
                    className="notifications-card-main"
                    aria-expanded={expanded}
                    onClick={() => toggleNotification(notification)}
                    disabled={actionLoading}
                  >
                    <span className="notifications-card-icon">
                      {details.gameIcon ? (
                        <img src={details.gameIcon} alt="" />
                      ) : (
                        <FontAwesomeIcon
                          icon={getNotificationIcon(details.platform)}
                        />
                      )}
                    </span>
                    <span className="notifications-card-copy">
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                      <small>
                        {new Date(notification.createdAt).toLocaleString(
                          "en-EG",
                          { dateStyle: "medium", timeStyle: "short" }
                        )}
                      </small>
                    </span>
                    {!notification.readAt && (
                      <span
                        className="notifications-unread-indicator"
                        aria-label="Unread"
                      />
                    )}
                    <FontAwesomeIcon
                      className={`notifications-expand-icon${expanded ? " expanded" : ""}`}
                      icon={faChevronDown}
                    />
                  </button>
                  <button
                    type="button"
                    className="notifications-delete"
                    aria-label={`Delete ${notification.title}`}
                    onClick={() => deleteNotification(notification.id)}
                    disabled={actionLoading}
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                  {expanded && (
                    <div className="notifications-card-details">
                      {notification.type === "bug_report_reply" && (
                        <span className="notifications-reply-badge">
                          <FontAwesomeIcon icon={faCircleCheck} />
                          GameOnix team reply
                        </span>
                      )}
                      {rows.map((row) => (
                        <div
                          className={`notifications-detail-row${row.long ? " long" : ""}`}
                          key={row.label}
                        >
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                      ))}
                      {details.slug && (
                        <Link
                          className="notifications-game-link"
                          to={`/game/${encodeURIComponent(details.slug)}`}
                        >
                          View game details
                        </Link>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default Notifications;
