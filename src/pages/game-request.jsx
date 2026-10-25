import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCheck,
  faChevronDown,
  faEnvelope,
  faGamepad,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import {
  faAndroid,
  faApple,
  faPlaystation,
  faWindows,
  faXbox,
} from "@fortawesome/free-brands-svg-icons";

import { useAuth } from "../context/AuthContext";
import { getCommunityApiToken } from "../api/session";
import "./../style/game-request-style.css";

const GAME_REQUEST_API_URL =
  "https://gameonixfav.vercel.app/api/game-request";
const PLATFORMS = [
  { label: "PC", icons: [faWindows], description: "Windows, macOS & Linux" },
  {
    label: "PS",
    icons: [faPlaystation],
    description: "All PlayStation generations",
  },
  { label: "Xbox", icons: [faXbox], description: "Xbox consoles" },
  {
    label: "Mobile",
    icons: [faApple, faAndroid],
    description: "iOS & Android",
  },
  { label: "Other", icons: [faGamepad], description: "Another platform" },
];

function PlatformIcons({ icons }) {
  return icons.map((icon) => (
    <FontAwesomeIcon icon={icon} key={icon.iconName} />
  ));
}

function GameRequest() {
  const { user, authLoading } = useAuth();
  const accountEmail = user?.email?.trim() || "";
  const [gameTitle, setGameTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [platformError, setPlatformError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [activePlatformIndex, setActivePlatformIndex] = useState(0);
  const platformPickerRef = useRef(null);
  const platformOptionRefs = useRef([]);

  useEffect(() => {
    if (!platformOpen) return undefined;

    function handleOutsidePointerDown(event) {
      if (!platformPickerRef.current?.contains(event.target)) {
        setPlatformOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [platformOpen]);

  useEffect(() => {
    if (platformOpen) {
      platformOptionRefs.current[activePlatformIndex]?.focus();
    }
  }, [activePlatformIndex, platformOpen]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!platform) {
      setPlatformError(true);
      setPlatformOpen(true);
      setError("");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setError("");
    setPlatformError(false);
    setSubmitted(false);
    setSubmitting(true);

    try {
      const token = await getCommunityApiToken();
      const response = await fetch(GAME_REQUEST_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "omit",
        body: JSON.stringify({
          gameTitle,
          platform,
          details,
          website: formData.get("website"),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Couldn't send your request. Please try again."
        );
      }

      setSubmitted(true);
      window.dispatchEvent(new Event("wallet-notifications-updated"));
      setGameTitle("");
      setPlatform("");
      setDetails("");
    } catch (requestError) {
      console.error("Game request submission failed:", requestError);
      setError(
        requestError.message ||
          "Couldn't send your request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="game-request-page">
      <header className="game-request-header">
        <span className="game-request-kicker">
          <FontAwesomeIcon icon={faGamepad} />
          YOUR NEXT ADVENTURE
        </span>
        <h1>
          Missing a game? <span>Let us know.</span>
        </h1>
        <p>
          Tell us what you would like to play. Your request goes privately to
          the GameOnix team.
        </p>
      </header>

      {authLoading ? (
        <section className="game-request-access-card" aria-live="polite">
          <span className="game-request-loader" aria-hidden="true" />
          <h2>Checking your account</h2>
          <p>Just a moment while we restore your GameOnix session.</p>
        </section>
      ) : !user ? (
        <section className="game-request-access-card">
          <span className="game-request-access-icon">
            <FontAwesomeIcon icon={faLock} />
          </span>
          <h2>Sign in to request a game</h2>
          <p>
            Signing in lets us send your request privately and notify you in
            the topbar when the team replies.
          </p>
          <Link
            className="game-request-access-link"
            to="/login"
            state={{ from: "/request-game" }}
          >
            Sign in to continue
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </section>
      ) : (
      <div className="game-request-layout">
        <section className="game-request-card">
          <div className="game-request-card-heading">
            <span className="game-request-icon">
              <FontAwesomeIcon icon={faEnvelope} />
            </span>
            <div>
              <h2>Request a game</h2>
              <p>
                Send your suggestion directly to the GameOnix team.
              </p>
            </div>
          </div>

          <form className="game-request-form" onSubmit={handleSubmit}>
            <label htmlFor="game-request-title">
              Game title <span aria-hidden="true">*</span>
            </label>
            <input
              id="game-request-title"
              name="gameTitle"
              type="text"
              placeholder="e.g. The game you want to see here"
              value={gameTitle}
              onChange={(event) => setGameTitle(event.target.value)}
              maxLength={120}
              autoComplete="off"
              required
            />

            <label>Contact email</label>
            <div className="game-request-account-email">
              <FontAwesomeIcon icon={faEnvelope} />
              <span>{accountEmail || "Account email"}</span>
              <span className="game-request-field-hint">
                From your account
              </span>
            </div>

            <label id="game-request-platform-label">
              Platform <span aria-hidden="true">*</span>
            </label>
            <div
              className={`game-request-platform-picker${platformOpen ? " is-open" : ""}${platformError ? " has-error" : ""}`}
              ref={platformPickerRef}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setPlatformOpen(false);
                }
              }}
            >
              <button
                aria-haspopup="listbox"
                aria-expanded={platformOpen}
                aria-labelledby="game-request-platform-label"
                aria-describedby={
                  platformError ? "game-request-platform-error" : undefined
                }
                aria-invalid={platformError}
                aria-required="true"
                className={`game-request-platform-trigger${platform ? " has-value" : ""}`}
                type="button"
                onClick={() => {
                  setActivePlatformIndex(
                    Math.max(
                      0,
                      PLATFORMS.findIndex((option) => option.label === platform)
                    )
                  );
                  setPlatformOpen((isOpen) => !isOpen);
                }}
                onKeyDown={(event) => {
                  if (
                    !platformOpen &&
                    ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)
                  ) {
                    event.preventDefault();
                    setActivePlatformIndex(
                      Math.max(
                        0,
                        PLATFORMS.findIndex(
                          (option) => option.label === platform
                        )
                      )
                    );
                    setPlatformOpen(true);
                  }
                }}
              >
                <span className="game-request-platform-trigger-copy">
                  <span className="game-request-platform-trigger-icon">
                    <PlatformIcons
                      icons={
                        PLATFORMS.find((option) => option.label === platform)
                          ?.icons || [faGamepad]
                      }
                    />
                  </span>
                  <span className="game-request-platform-trigger-text">
                    <span className="game-request-platform-value">
                      {platform || "Choose a platform"}
                    </span>
                    <span className="game-request-platform-caption">
                      {platform
                        ? "Selected platform"
                        : "Select where you want to play"}
                    </span>
                  </span>
                </span>
                <FontAwesomeIcon
                  className="game-request-platform-chevron"
                  icon={faChevronDown}
                />
              </button>

              {platformOpen && (
                <div
                  aria-labelledby="game-request-platform-label"
                  className="game-request-platform-menu"
                  role="listbox"
                >
                  <span className="game-request-platform-menu-heading">
                    SELECT A PLATFORM
                  </span>
                  {PLATFORMS.map((option, index) => (
                    <button
                      aria-selected={platform === option.label}
                      className={`game-request-platform-option${platform === option.label ? " is-selected" : ""}`}
                      key={option.label}
                      ref={(element) => {
                        platformOptionRefs.current[index] = element;
                      }}
                      role="option"
                      tabIndex={index === activePlatformIndex ? 0 : -1}
                      type="button"
                      onClick={() => {
                        setPlatform(option.label);
                        setPlatformError(false);
                        setPlatformOpen(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                          event.preventDefault();
                          const direction = event.key === "ArrowDown" ? 1 : -1;
                          setActivePlatformIndex(
                            (index + direction + PLATFORMS.length) %
                              PLATFORMS.length
                          );
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          setPlatformOpen(false);
                          platformPickerRef.current
                            ?.querySelector(".game-request-platform-trigger")
                            ?.focus();
                        }
                      }}
                    >
                      <span className="game-request-platform-option-icon">
                        <PlatformIcons icons={option.icons} />
                      </span>
                      <span className="game-request-platform-option-copy">
                        <span className="game-request-platform-option-name">
                          {option.label}
                        </span>
                        <span className="game-request-platform-option-description">
                          {option.description}
                        </span>
                      </span>
                      {platform === option.label && (
                        <FontAwesomeIcon
                          className="game-request-platform-option-check"
                          icon={faCheck}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {platformError && (
              <span
                className="game-request-platform-error"
                id="game-request-platform-error"
                role="alert"
              >
                Choose a platform to continue.
              </span>
            )}

            <label htmlFor="game-request-details">Anything else?</label>
            <textarea
              id="game-request-details"
              name="details"
              placeholder="Add a store link, version, or any helpful details..."
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              rows={4}
            />

            <div className="game-request-honeypot" aria-hidden="true">
              <label htmlFor="game-request-website">Leave this field empty</label>
              <input
                id="game-request-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="game-request-message is-error" role="alert">
                {error}
              </p>
            )}
            {submitted && (
              <p className="game-request-message is-success" role="status">
                Your request was sent privately to the GameOnix team. Thanks
                for the suggestion!
              </p>
            )}

            <button
              className="game-request-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Sending request..." : "Send private request"}
              {!submitting && <FontAwesomeIcon icon={faArrowRight} />}
            </button>
            <p className="game-request-required">* Required fields</p>
          </form>
        </section>

        <aside className="game-request-aside">
          <div className="game-request-privacy-icon">
            <FontAwesomeIcon icon={faLock} />
          </div>
          <h2>Your request stays private</h2>
          <p>
            Your request and email address are sent directly to the GameOnix
            team. They are not posted publicly or shown to other players.
          </p>
          <div className="game-request-aside-note">
            <FontAwesomeIcon icon={faCheck} />
            <span>No public comments or shared contact details.</span>
          </div>
          <div className="game-request-aside-note">
            <FontAwesomeIcon icon={faCheck} />
            <span>We will review the suggestion, but cannot promise every game.</span>
          </div>
        </aside>
      </div>
      )}
    </main>
  );
}

export default GameRequest;
