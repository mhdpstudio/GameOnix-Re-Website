import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCheck,
  faEnvelope,
  faGamepad,
  faLock,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "../context/AuthContext";
import "./../style/game-request-style.css";

const GAME_REQUEST_API_URL =
  "https://gameonixfav.vercel.app/api/game-request";

function GameRequest() {
  const { user } = useAuth();
  const accountEmail = user?.email?.trim() || "";
  const [gameTitle, setGameTitle] = useState("");
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setSubmitted(false);
    setSubmitting(true);

    try {
      const response = await fetch(GAME_REQUEST_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          gameTitle,
          email: accountEmail || email,
          platform,
          details,
          username: user?.username || "",
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
      setGameTitle("");
      if (!accountEmail) setEmail("");
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

            {accountEmail ? (
              <>
                <label>Contact email</label>
                <div className="game-request-account-email">
                  <FontAwesomeIcon icon={faEnvelope} />
                  <span>{accountEmail}</span>
                  <span className="game-request-field-hint">
                    From your account
                  </span>
                </div>
              </>
            ) : (
              <>
                <label htmlFor="game-request-email">
                  Your email <span aria-hidden="true">*</span>
                </label>
                <input
                  id="game-request-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  autoComplete="email"
                  required
                />
                <span className="game-request-field-hint">
                  Only used if the team needs to follow up on your request.
                </span>
              </>
            )}

            <label htmlFor="game-request-platform">Platform</label>
            <select
              id="game-request-platform"
              name="platform"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              <option value="">Choose a platform (optional)</option>
              <option value="PC">PC</option>
              <option value="PlayStation">PlayStation</option>
              <option value="Xbox">Xbox</option>
              <option value="Nintendo Switch">Nintendo Switch</option>
              <option value="Mobile">Mobile</option>
              <option value="Other">Other</option>
            </select>

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
    </main>
  );
}

export default GameRequest;
