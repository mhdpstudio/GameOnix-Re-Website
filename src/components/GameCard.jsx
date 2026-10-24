
import { useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGamepad } from "@fortawesome/free-solid-svg-icons";

import "../style/game-card.css";
import { getGameCategories } from "../utils/game-categories";

function capitalizeFirstLetter(value) {
  const label = String(value || "").trim();

  return label ? label[0].toUpperCase() + label.slice(1) : "";
}

function getPlatformLabel(value) {
  if (Array.isArray(value)) {
    return (
      value
        .map((platform) => getPlatformLabel(platform))
        .filter(Boolean)
        .join(", ") || "Platform"
    );
  }

  const platform = String(value || "").trim().toLowerCase();

  if (["pc", "windows", "computer"].includes(platform)) return "PC";

  if (["ps", "playstation", "ps4", "ps5"].includes(platform)) {
    return "PlayStation";
  }

  if (
    ["xbox", "xbox one", "xbox series x", "xbox series s"].includes(platform)
  ) {
    return "Xbox";
  }

  if (["switch", "nintendo switch"].includes(platform)) {
    return "Nintendo Switch";
  }

  return platform
    ? platform.replace(/\b\w/g, (character) => character.toUpperCase())
    : "Platform";
}

function GameCard({ game, showNewBadge = false, className = "" }) {
  const poster = game?.poster || game?.game_poster || "";
  const [failedPoster, setFailedPoster] = useState("");
  const title = game?.title || "Untitled Game";
  const platformLabel = getPlatformLabel(game?.platform);

  // عرض جميع الأنواع الموجودة في gameTypes
  const gameCategories = getGameCategories(game);

  const fileTypeLabel = capitalizeFirstLetter(game?.fileType);
  const imageFailed = failedPoster === poster;

  return (
    <Link
      to={`/game/${encodeURIComponent(game.slug)}`}
      className={`game-card ${className}`.trim()}
      title={title}
    >
      <div className="game-card-poster">
        {poster && !imageFailed ? (
          <img
            src={poster}
            alt={`${title} poster`}
            loading="lazy"
            onError={() => setFailedPoster(poster)}
          />
        ) : (
          <div className="game-card-placeholder">
            <FontAwesomeIcon icon={faGamepad} />
            <span>No poster available</span>
          </div>
        )}

        {showNewBadge && <span className="game-card-new">NEW</span>}
      </div>

      <div className="game-card-info">
        <div className="game-card-meta">
          <span
            className="game-card-platform"
            title={`Supported platform: ${platformLabel}`}
          >
            {platformLabel}
          </span>

          {gameCategories.map((category, index) => (
            <span
              className="game-card-category"
              key={`${category}-${index}`}
              title={`Category: ${category}`}
            >
              {capitalizeFirstLetter(category)}
            </span>
          ))}

          {fileTypeLabel && (
            <span
              className="game-card-file-type"
              title={`File type: ${fileTypeLabel}`}
            >
              {fileTypeLabel}
            </span>
          )}
        </div>

        <h3 className="game-card-title" title={title}>
          {title}
        </h3>

        <p
          className="game-card-publisher"
          title={game?.publisher || ""}
        >
          {game?.publisher || "Unknown publisher"}
        </p>
      </div>
    </Link>
  );
}

export default GameCard;
