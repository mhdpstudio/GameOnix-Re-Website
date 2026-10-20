import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFavorites } from "../api/favorites";
import GameCard from "../components/GameCard";
import "./../style/library-style.css";

const DATA_URL =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/games-data.json";

function getGameList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.games) ? data.games : [];
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
            {games.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default Library;
