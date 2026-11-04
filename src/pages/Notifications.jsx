import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const NOTIFICATIONS_UPDATED_EVENT = "wallet-notifications-updated";

function notifyNotificationCountChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

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
    topicLabel: "Topic",
    orderId: "Order ID",
  };

  return Object.entries(details)
    .filter(([key, value]) => {
      return (
        key !== "gameIcon" &&
        key !== "gameLink" &&
        key !== "imageData" &&
        !(key === "gameName" && details.gameTitle) &&
        !(key === "topic" && details.topicLabel) &&
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

async function compressNotificationImage(file) {
  if (!file) return "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 10 MB.");
  }

  const image = await createImageBitmap(file);
  try {
    for (
      let maxDimension = 1200;
      maxDimension >= 300;
      maxDimension = Math.floor(maxDimension * 0.8)
    ) {
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.width, image.height)
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to process this image.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.68, 0.54, 0.4, 0.28]) {
        const imageData = canvas.toDataURL("image/jpeg", quality);
        const base64 = imageData.split(",")[1];
        const byteLength = Math.floor((base64.length * 3) / 4);
        if (byteLength <= 30 * 1024) return imageData;
      }
    }
  } finally {
    image.close();
  }

  throw new Error("This image could not be compressed enough to send.");
}

function Notifications() {
  const { user, authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [canSend, setCanSend] = useState(false);
  const [canSendOwner, setCanSendOwner] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [senderUsername, setSenderUsername] = useState("");
  const [senderTitle, setSenderTitle] = useState("A message from GameOnix");
  const [senderMessage, setSenderMessage] = useState("");
  const [senderImage, setSenderImage] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState("");
  const senderFormRef = useRef(null);

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
      setCanSend(data.canSend === true);
      setCanSendOwner(data.canSend === true ? user.username : "");
    } catch (loadError) {
      console.error("Notifications page load failed:", loadError);
      setError(loadError.message || "Unable to load your notifications.");
      setCanSend(false);
      setCanSendOwner("");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const initialLoad = window.setTimeout(loadNotifications, 0);
    const interval = window.setInterval(loadNotifications, 60_000);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, loadNotifications);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        loadNotifications
      );
    };
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

  async function sendDirectMessage(event) {
    event.preventDefault();
    if (!canSend || sending) return;

    setSending(true);
    setError("");
    setSendSuccess("");
    try {
      const token = await getCommunityApiToken();
      const imageData = await compressNotificationImage(senderImage);
      const response = await fetch(NOTIFICATIONS_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "omit",
        body: JSON.stringify({
          action: "send",
          username: senderUsername.trim(),
          title: senderTitle.trim(),
          message: senderMessage.trim(),
          imageData,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to send this notification.");
      }

      setSenderUsername("");
      setSenderTitle("A message from GameOnix");
      setSenderMessage("");
      setSenderImage(null);
      senderFormRef.current?.reset();
      setSendSuccess("The private notification was sent.");
      notifyNotificationCountChanged();
      loadNotifications();
    } catch (sendError) {
      console.error("Direct notification send failed:", sendError);
      setError(sendError.message || "Unable to send this notification.");
    } finally {
      setSending(false);
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
      notifyNotificationCountChanged();
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
      notifyNotificationCountChanged();
    }
  }

  async function deleteNotification(notificationId) {
    const result = await updateNotifications("DELETE", { notificationId });
    if (result) {
      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId)
      );
      setExpandedId((current) => (current === notificationId ? null : current));
      notifyNotificationCountChanged();
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
      notifyNotificationCountChanged();
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

      {canSend && canSendOwner === user.username && (
        <form
          ref={senderFormRef}
          className="notifications-compose"
          onSubmit={sendDirectMessage}
        >
          <div className="notifications-compose-heading">
            <div>
              <span className="notifications-kicker">ADMIN TOOLS</span>
              <h2>Send a private notification</h2>
            </div>
            <span>Only the selected account can view it.</span>
          </div>
          <div className="notifications-compose-fields">
            <label>
              Recipient username
              <input
                type="text"
                value={senderUsername}
                onChange={(event) => setSenderUsername(event.target.value)}
                maxLength={64}
                autoComplete="off"
                required
              />
            </label>
            <label>
              Title
              <input
                type="text"
                value={senderTitle}
                onChange={(event) => setSenderTitle(event.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label className="notifications-compose-message">
              Message
              <textarea
                value={senderMessage}
                onChange={(event) => setSenderMessage(event.target.value)}
                maxLength={2000}
                rows={4}
                required
              />
            </label>
            <label className="notifications-compose-image">
              Image (optional)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setSenderImage(event.target.files?.[0] || null)
                }
              />
              <small>
                JPEG, PNG, or WebP; compressed to fit the private notification.
              </small>
            </label>
          </div>
          {sendSuccess && (
            <p className="notifications-compose-success" role="status">
              {sendSuccess}
            </p>
          )}
          <button
            className="notifications-compose-submit"
            type="submit"
            disabled={sending}
          >
            {sending ? "Sending..." : "Send notification"}
          </button>
        </form>
      )}

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
                      {details.imageData ? (
                        <img src={details.imageData} alt="" />
                      ) : details.gameIcon ? (
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
                      {typeof details.imageData === "string" && (
                        <img
                          className="notifications-message-image"
                          src={details.imageData}
                          alt="Image attached to this notification"
                        />
                      )}
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
