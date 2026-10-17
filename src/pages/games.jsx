
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faGamepad,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";

import "./../style/games-style.css";

const GAMES_DATA_URL =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/games-data.json";

const NEW_BADGE_DURATION = 24 * 60 * 60 * 1000;

function getGameList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.games)) return data.games;
  return [];
}

function normalizePlatform(value) {
  const platform = String(value || "").trim().toLowerCase();

  if (["pc", "windows", "computer"].includes(platform)) return "pc";
  if (["ps", "playstation", "ps4", "ps5"].includes(platform)) return "ps";

  return platform;
}

function isNewGame(game) {
  const value = game?.createdAt;

  if (!value || typeof value !== "string") return false;

  const timestamp = Date.parse(value);
  const now = Date.now();

  return (
    Number.isFinite(timestamp) &&
    timestamp <= now &&
    now - timestamp < NEW_BADGE_DURATION
  );
}

function GamePoster({ game }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [game?.poster]);

  if (!game?.poster || imageFailed) {
    return (
      <div className="games-poster-placeholder">
        <FontAwesomeIcon icon={faGamepad} />
        <span>No poster available</span>
      </div>
    );
  }

  return (
    <img
      className="games-poster-image"
      src={game.poster}
      alt={`${game.title} poster`}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

function Games() {
  const [searchParams] = useSearchParams();

  const platform = normalizePlatform(searchParams.get("platform"));
  const type = searchParams.get("type") || "";

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadGames() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(GAMES_DATA_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch games data");
        }

        const data = await response.json();

        setGames(
          getGameList(data).filter((game) => game?.slug && game?.title)
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error loading games:", err);
          setError("Couldn't load games right now. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadGames();

    return () => controller.abort();
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesPlatform =
        !platform || normalizePlatform(game.platform) === platform;

      const matchesType =
        !type ||
        String(game.gameType || "Other").trim().toLowerCase() ===
          type.trim().toLowerCase();

      return matchesPlatform && matchesType;
    });
  }, [games, platform, type]);

  const platformTitle =
    platform === "pc"
      ? "PC Games"
      : platform === "ps"
        ? "PlayStation Games"
        : "All Games";

  const pageTitle = type ? `${type} Games` : platformTitle;

  if (loading) {
    return (
      <main className="games-page">
        <div className="games-status">
          <span className="games-loader" />
          <p>Loading games...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="games-page">
        <div className="games-status">
          <p>{error}</p>

          <button
            type="button"
            className="games-retry-button"
            onClick={() => window.location.reload()}
          >
            <FontAwesomeIcon icon={faRotate} />
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="games-page">
      <header className="games-page-header">
        <Link to="/" className="games-back-link">
          <FontAwesomeIcon icon={faChevronLeft} />
          Home
        </Link>

        <span className="games-platform-label">{platformTitle}</span>

        <h1>{pageTitle}</h1>

        <p>
          Explore {filteredGames.length}{" "}
          {filteredGames.length === 1 ? "game" : "games"}.
        </p>
      </header>

      {filteredGames.length === 0 ? (
        <div className="games-empty">
          <FontAwesomeIcon icon={faGamepad} />
          <h2>No games found</h2>
          <p>There are no games matching this category yet.</p>
          <Link to="/">Back to Home</Link>
        </div>
      ) : (
        <div className="games-grid">
          {filteredGames.map((game) => (
            <Link
              to={`/game/${encodeURIComponent(game.slug)}`}
              className="games-card"
              key={game.slug}
              title={game.title}
            >
              <div className="games-card-poster">
                <GamePoster game={game} />

                {isNewGame(game) && (
                  <span className="games-new-badge">NEW</span>
                )}
              </div>

              <span className="games-card-platform">
                {normalizePlatform(game.platform).toUpperCase()}
              </span>

              <div className="games-card-info">
                <h2>{game.title}</h2>
                <p>{game.publisher || game.gameType || "Game"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default Games;
