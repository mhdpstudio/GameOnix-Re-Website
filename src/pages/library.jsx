import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFavorites } from "../api/favorites";
import "./../style/library-style.css";

const DATA_URL =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/games-data.json";

function getGameList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.games) ? data.games : [];
}

function getCategory(game) {
  return String(game?.gameType || "Other").trim();
}

function getPlatformLabel(platform) {
  if (Array.isArray(platform)) {
    return platform.join(", ");
  }

  const value = String(platform || "").trim();

  if (!value) return "";

  const platformLabels = {
    pc: "PC",
    windows: "PC",
    playstation: "PlayStation",
    ps5: "PS5",
    ps4: "PS4",
    xbox: "Xbox",
    "xbox series x/s": "Xbox Series X/S",
    switch: "Nintendo Switch",
    "nintendo switch": "Nintendo Switch",
    mobile: "Mobile",
    android: "Android",
    ios: "iOS",
    mac: "Mac",
    linux: "Linux",
  };

  return platformLabels[value.toLowerCase()] || value;
}

function getPoster(game) {
  return game?.poster || game?.game_poster || "";
}

function GamePoster({ game }) {
  const [imageFailed, setImageFailed] = useState(false);
  const poster = getPoster(game);

  useEffect(() => {
    setImageFailed(false);
  }, [poster]);

  return (
    <div className="library-game-poster">
      {poster && !imageFailed ? (
        <img
          src={poster}
          alt={`${game.title || "Game"} poster`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="library-game-placeholder">
          <span aria-hidden="true">🎮</span>
          <span>Poster unavailable</span>
        </div>
      )}
    </div>
  );
}

function Library() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLibrary() {
      try {
        setLoading(true);
        setError("");

        const [favoritesData, response] = await Promise.all([
          getFavorites(),
          fetch(DATA_URL),
        ]);

        if (!response.ok) {
          throw new Error("Couldn't load game details.");
        }

        const favoriteSlugs = Array.isArray(favoritesData.favorites)
          ? favoritesData.favorites
          : [];

        const data = await response.json();
        const allGames = getGameList(data);

        const favoriteGames = favoriteSlugs
          .map((slug) => allGames.find((game) => game.slug === slug))
          .filter(Boolean);

        if (active) {
          setGames(favoriteGames);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Couldn't load your library.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLibrary();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="library-page">
      <header className="library-welcome">
        <div className="library-welcome-copy">
          <span className="library-eyebrow">
            YOUR PERSONAL COLLECTION
          </span>

          <h1>
            My <span>Library</span>
          </h1>

          <p>
            All your favorite games, collected in one place.
            Pick up your next adventure.
          </p>
        </div>

        <div className="library-welcome-art" aria-hidden="true">
          ♡
        </div>
      </header>

      <section className="library-section">
        <div className="library-heading">
          <div>
            <span className="library-kicker">YOUR COLLECTION</span>
            <h2>Favorite Games</h2>
            <p>Your saved games are ready when you are.</p>
          </div>

          {!loading && !error && (
            <span className="library-count">
              {games.length} {games.length === 1 ? "GAME" : "GAMES"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="library-status">
            <span className="library-loader" />
            <p>Loading your library...</p>
          </div>
        ) : error ? (
          <div className="library-status" role="alert">
            <p>{error}</p>

            <button
              className="library-retry"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        ) : games.length === 0 ? (
          <div className="library-empty">
            <div className="library-empty-icon" aria-hidden="true">
              ♡
            </div>

            <h2>Your library is waiting</h2>

            <p>
              Add games to your favorites and they will show up here.
            </p>

            <Link to="/" className="library-explore">
              Explore Games <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <div className="library-games-grid">
            {games.map((game) => {
              const category = getCategory(game);
              const platform = getPlatformLabel(game.platform);
              const publisher = game.publisher || "Unknown publisher";

              return (
                <Link
                  to={`/game/${game.slug}`}
                  className="library-game-card"
                  key={game.slug}
                >
                  <GamePoster game={game} />

                  <div className="library-game-info">
                    <div className="library-game-meta">
                      {platform && (
                        <span className="library-game-platform">
                          {platform}
                        </span>
                      )}

                      <span className="library-game-category">
                        {category}
                      </span>
                    </div>

                    <h3>{game.title || "Untitled Game"}</h3>

                    <p>{publisher}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

export default Library;
