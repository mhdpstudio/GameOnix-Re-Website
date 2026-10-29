import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCheck,
  faLock,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

import { useAuth } from "../context/AuthContext";
import { getCommunityApiToken } from "../api/session";
import "./../style/support-style.css";

const SUPPORT_API_URL =
  "https://gameonixfav.vercel.app/api/support-request";
const WHATSAPP_URL = "https://wa.link/2od11q";
const MAX_MESSAGE_LENGTH = 1500;
const MIN_MESSAGE_LENGTH = 10;

const TOPICS = [
  { value: "order", label: "Order or purchase" },
  { value: "gift-card", label: "Gift card code" },
  { value: "wallet", label: "Wallet top-up" },
  { value: "account", label: "Account access" },
  { value: "other", label: "Something else" },
];

function getTopicLabel(topicValue) {
  return (
    TOPICS.find((topic) => topic.value === topicValue)?.label ||
    "Something else"
  );
}

export default function Support() {
  const { user, authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  const [topic, setTopic] = useState("order");
  const [orderId, setOrderId] = useState(
    String(searchParams.get("order") || "").slice(0, 60)
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedMessage = message.trim();

    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      setError(
        `Add at least ${MIN_MESSAGE_LENGTH} characters so we can help.`
      );
      return;
    }

    const honeypot =
      new FormData(event.currentTarget).get("website") || "";

    setSubmitting(true);

    try {
      const token = await getCommunityApiToken();
      const response = await fetch(SUPPORT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "omit",
        body: JSON.stringify({
          topic,
          orderId: orderId.trim(),
          message: trimmedMessage,
          website: honeypot,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Couldn't send your message. Please try again."
        );
      }

      setSentMessage({
        topic: topic,
        orderId: orderId.trim(),
      });
      setMessage("");
      window.dispatchEvent(new Event("wallet-notifications-updated"));
    } catch (submitError) {
      console.error("Support message failed:", submitError);
      setError(
        submitError.message ||
          "Couldn't send your message. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startAnotherMessage() {
    setSentMessage(null);
    setError("");
    setMessage("");
  }

  return (
    <section className="support-page">
      <header className="support-header">
        <h1>Support</h1>
        <p>
          Send us a message about an order, a gift card code, a wallet top-up or
          your account.
        </p>
      </header>

      <div className="support-layout">
        <section className="support-card" aria-label="Contact support">
          {sentMessage ? (
            <div className="support-sent" role="status">
              <span className="support-sent-icon">
                <FontAwesomeIcon icon={faCheck} />
              </span>

              <h2>Message sent</h2>

              <dl className="support-sent-meta">
                <div>
                  <dt>Topic</dt>
                  <dd>{getTopicLabel(sentMessage.topic)}</dd>
                </div>

                {sentMessage.orderId && (
                  <div>
                    <dt>Order ID</dt>
                    <dd>{sentMessage.orderId}</dd>
                  </div>
                )}
              </dl>

              <p className="support-sent-note">
                Replies arrive in your notifications and by email.
              </p>

              <button
                type="button"
                className="support-secondary-button"
                onClick={startAnotherMessage}
              >
                Send another message
              </button>
            </div>
          ) : authLoading ? (
            <div className="support-state" role="status">
              Checking your account...
            </div>
          ) : !user ? (
            <div className="support-access">
              <span className="support-access-icon">
                <FontAwesomeIcon icon={faLock} />
              </span>

              <h2>Sign in to send a message</h2>

              <p>
                Support replies are tied to your account, so sign in before
                sending a private message.
              </p>

              <Link
                className="support-access-link"
                to="/login"
                state={{ from: "/support" }}
              >
                Sign in
                <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            </div>
          ) : (
            <form className="support-form" onSubmit={handleSubmit} noValidate>
              <div className="support-field">
                <label htmlFor="support-topic">Topic</label>

                <select
                  id="support-topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                >
                  {TOPICS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="support-field">
                <label htmlFor="support-order-id">
                  Order ID <span>(optional)</span>
                </label>

                <input
                  id="support-order-id"
                  type="text"
                  maxLength={60}
                  autoComplete="off"
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  placeholder="Paste the request ID from My Orders"
                />
              </div>

              <div className="support-field">
                <label htmlFor="support-email">Account email</label>

                <input
                  id="support-email"
                  type="email"
                  value={user.email || ""}
                  readOnly
                />
              </div>

              <div className="support-field">
                <label htmlFor="support-message">Message</label>

                <textarea
                  id="support-message"
                  rows={6}
                  maxLength={MAX_MESSAGE_LENGTH}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Describe what happened and what you expected."
                />

                <span className="support-char-count">
                  {message.length} / {MAX_MESSAGE_LENGTH}
                </span>
              </div>

              <input
                type="text"
                name="website"
                className="support-honeypot"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              {error && (
                <p className="support-message is-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="support-submit"
                disabled={submitting}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
                {submitting ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </section>

        <aside className="support-channels">
          <section className="support-whatsapp">
            <span className="support-whatsapp-icon">
              <FontAwesomeIcon icon={faWhatsapp} />
            </span>

            <h2>WhatsApp</h2>
            <p>Send screenshots and get order updates directly.</p>

            <a
              className="support-whatsapp-link"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
            >
              Open WhatsApp
              <FontAwesomeIcon icon={faArrowRight} />
            </a>
          </section>

          <section className="support-note">
            <h2>Private messages</h2>

            <ul>
              <li>
                <FontAwesomeIcon icon={faCheck} />
                Replies arrive in your notifications and by email.
              </li>

              <li>
                <FontAwesomeIcon icon={faCheck} />
                Add your order ID so we can find the purchase.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
