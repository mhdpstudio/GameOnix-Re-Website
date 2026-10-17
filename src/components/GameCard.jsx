
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faGamepad,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";

import {
  getSavedGames,
  isGameSaved,
  toggleSavedGame,
  subscribeSavedGames,
} from "../utils/savedGames";

import "../style/game-card.css";

function normalizePlatform(value) {
  const platform = String(value || "").trim().toLowerCase();

  if (["pc", "windows", "computer"].includes(platform)) return "PC";
  if (["ps", "playstation", "ps4", "ps5"].includes(platform)) {
    return "PlayStation";
  }

  return platform ? platform.toUpperCase() : "Platform";
}

function GameCard({ game, showNewBadge = false }) {
  const [saved, setSaved] = useState(() => isGameSaved(game.slug));
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setSaved(isGameSaved(game.slug));
    setImageFailed(false);
  }, [game.slug, game.poster, game.game_poster]);

  useEffect(() => {
    return subscribeSavedGames(() => {
      setSaved(isGameSaved(game.slug));
    });
  }, [game.slug]);

  const poster = game.poster || game.game_poster || "";
  const genre = String(game.gameType || "Other").trim();

  function handleSave(event) {
    event.preventDefault();
    event.stopPropagation();

    toggleSavedGame(game);
    setSaved(isGameSaved(game.slug));
  }

  return (
    <article className="game-card">
      <div className="game-card-poster">
        {poster && !imageFailed ? (
          <img
            src={poster}
            alt={`${game.title} poster`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="game-card-placeholder">
            <FontAwesomeIcon icon={faGamepad} />
            <span>No poster available</span>
          </div>
        )}

        {showNewBadge && <span className="game-card-new">NEW</span>}

        <button
          type="button"
          className={`game-card-heart ${saved ? "is-saved" : ""}`}
          onClick={handleSave}
          aria-label={saved ? `Remove ${game.title} from library` : `Save ${game.title}`}
          aria-pressed={saved}
          title={saved ? "Remove from My Library" : "Save to My Library"}
        >
          <FontAwesomeIcon icon={faHeart} />
        </button>
      </div>

      <div className="game-card-content">
        <div className="game-card-meta">
          <span className="game-card-platform">
            {normalizePlatform(game.platform)}
          </span>
          <span className="game-card-genre">{genre.toUpperCase()}</span>
        </div>

        <h3 className="game-card-title" title={game.title}>
          {game.title}
        </h3>

        <p className="game-card-publisher">
          {game.publisher || "Unknown publisher"}
        </p>

        <Link
          to={`/game/${encodeURIComponent(game.slug)}`}
          className="game-card-open"
          title={`Open ${game.title}`}
        >
          <span>Open Game</span>
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
        </Link>
      </div>
    </article>
  );
}

export default GameCard;
