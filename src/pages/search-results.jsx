import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faGamepad,
  faArrowUpRightFromSquare,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";

import "./../style/search-results-style.css";

const GAMES_DATA_URL =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/games-data.json";

function getGameList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.games)) return data.games;
  return [];
}

function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

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
          throw new Error("Failed to load games");
        }

        const data = await response.json();

        setGames(
          getGameList(data).filter((game) => game?.slug && game?.title)
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Search results error:", err);
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
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return [];

    return games.filter((game) => {
      const searchableFields = [
        game.title,
        game.publisher,
        game.gameType,
        game.platform,
        game.version,
      ];

      return searchableFields.some((value) =>
        String(value || "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [games, query]);

  return (
    <main className="search-results-page">
      <header className="search-results-header">
        <span className="search-results-kicker">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          GAMEONIX SEARCH
        </span>

        <h1>
          Search <span>Results</span>
        </h1>

        <p>
          {query.trim()
            ? `Discover games matching "${query.trim()}".`
            : "Search games, publishers, and genres to find your next adventure."}
        </p>
      </header>

      <section className="search-results-content">
        <div className="search-results-toolbar">
          <div className="search-results-summary">
            <h2>
              {loading
                ? "Searching games..."
                : error
                  ? "Search unavailable"
                  : !query.trim()
                    ? "Start your search"
                    : "Matching games"}
            </h2>

            {!loading && !error && query.trim() && (
              <span className="search-results-count">
                {filteredGames.length}{" "}
                {filteredGames.length === 1 ? "game" : "games"} found
              </span>
            )}
          </div>

          {query.trim() && (
            <Link className="search-results-new-search" to="/discover">
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              New search
            </Link>
          )}
        </div>

        {loading ? (
          <div className="search-results-state">
            <span className="search-results-loader" />
            <h3>Finding your games</h3>
            <p>Loading the GameOnix collection...</p>
          </div>
        ) : error ? (
          <div className="search-results-state">
            <FontAwesomeIcon
              icon={faGamepad}
              className="search-results-state-icon"
            />
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button
              type="button"
              className="search-results-retry"
              onClick={() => window.location.reload()}
            >
              <FontAwesomeIcon icon={faRotate} />
              Try again
            </button>
          </div>
        ) : !query.trim() ? (
          <div className="search-results-state">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="search-results-state-icon"
            />
            <h3>What are you looking for?</h3>
            <p>
              Enter a game title, publisher, or genre in the search bar above.
            </p>
            <Link to="/discover" className="search-results-action">
              Explore games
            </Link>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="search-results-state">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="search-results-state-icon"
            />
            <h3>No games found</h3>
            <p>
              We couldn't find anything matching "{query.trim()}". Try a
              different title, publisher, or genre.
            </p>
            <Link to="/discover" className="search-results-action">
              Explore all games
            </Link>
          </div>
        ) : (
          <div className="search-results-grid">
            {filteredGames.map((game) => (
              <Link
                key={game.slug}
                to={`/game/${encodeURIComponent(game.slug)}`}
                className="search-game-card"
                title={game.title}
              >
                <div className="search-game-poster">
                  {game.poster || game.game_poster ? (
                    <img
                      src={game.poster || game.game_poster}
                      alt={`${game.title} poster`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="search-game-placeholder">
                      <FontAwesomeIcon icon={faGamepad} />
                      <span>No poster available</span>
                    </div>
                  )}

                  <span className="search-game-open">
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                  </span>
                </div>

                <div className="search-game-info">
                  <h3>{game.title}</h3>

                  <p>
                    {game.publisher || game.gameType || "Game"}
                  </p>

                  <div className="search-game-meta">
                    {game.platform && (
                      <span>{String(game.platform).toUpperCase()}</span>
                    )}

                    {game.gameType && <span>{game.gameType}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default SearchResults;