import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCompass,
  faMagnifyingGlass,
  faGamepad,
  faRotate,
  faSliders,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import GameCard from "../components/GameCard";

import "./../style/discover-style.css";

const GAMES_DATA_URL =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/games-data.json";

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

function getPlatformLabel(platform) {
  if (platform === "pc") return "PC";
  if (platform === "ps") return "PlayStation";

  return platform.toUpperCase();
}

function getAddedAt(game) {
  const value = game?.createdAt;

  if (!value || typeof value !== "string") return null;

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function Discover() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("default");

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

        const validGames = getGameList(data).filter(
          (game) => game?.slug && game?.title
        );

        setGames(validGames);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error loading discover games:", err);
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

  const platforms = useMemo(() => {
    const found = new Map();

    games.forEach((game) => {
      const platform = normalizePlatform(game.platform);

      if (platform && !found.has(platform)) {
        found.set(platform, getPlatformLabel(platform));
      }
    });

    return Array.from(found.entries()).map(([id, label]) => ({
      id,
      label,
    }));
  }, [games]);

  const genres = useMemo(() => {
    const found = new Set();

    games.forEach((game) => {
      const genre = String(game.gameType || "Other").trim();

      if (genre) found.add(genre);
    });

    return Array.from(found);
  }, [games]);

  const filteredGames = useMemo(() => {
    let result = games.filter((game) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        String(game.title || "").toLowerCase().includes(query) ||
        String(game.publisher || "").toLowerCase().includes(query) ||
        String(game.gameType || "").toLowerCase().includes(query);

      const matchesPlatform =
        selectedPlatform === "all" ||
        normalizePlatform(game.platform) === selectedPlatform;

      const genre = String(game.gameType || "Other").trim() || "Other";

      const matchesGenre =
        selectedGenre === "all" || genre === selectedGenre;

      return matchesSearch && matchesPlatform && matchesGenre;
    });

    if (sortBy === "name-asc") {
      result = [...result].sort((a, b) =>
        a.title.localeCompare(b.title)
      );
    } else if (sortBy === "name-desc") {
      result = [...result].sort((a, b) =>
        b.title.localeCompare(a.title)
      );
    } else if (sortBy === "recent") {
      result = [...result].sort((a, b) => {
        const dateA = getAddedAt(a) ?? 0;
        const dateB = getAddedAt(b) ?? 0;

        return dateB - dateA;
      });
    }

    return result;
  }, [games, search, selectedPlatform, selectedGenre, sortBy]);

  function clearFilters() {
    setSearch("");
    setSelectedPlatform("all");
    setSelectedGenre("all");
    setSortBy("default");
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedPlatform !== "all" ||
    selectedGenre !== "all" ||
    sortBy !== "default";

  return (
    <main className="discover-page">
      <section className="discover-hero">
        <div className="discover-hero-content">
          <span className="discover-eyebrow">
            <FontAwesomeIcon icon={faCompass} />
            EXPLORE THE GAMEONIX LIBRARY
          </span>

          <h1>
            Discover your next
            <span> adventure.</span>
          </h1>

          <p>
            Search, explore, and find the games worth playing.
            Your next favorite world is waiting.
          </p>

          <div className="discover-hero-stats">
            <div>
              <strong>{games.length}</strong>
              <span>Games to explore</span>
            </div>

            <span className="discover-stat-divider" />

            <div>
              <strong>{platforms.length}</strong>
              <span>Platforms</span>
            </div>

            <span className="discover-stat-divider" />

            <div>
              <strong>{genres.length}</strong>
              <span>Genres</span>
            </div>
          </div>
        </div>

        <div className="discover-hero-art" aria-hidden="true">
          <div className="discover-art-glow" />
          <div className="discover-art-icon">
            <FontAwesomeIcon icon={faGamepad} />
          </div>
          <span className="discover-art-orbit discover-art-orbit-one" />
          <span className="discover-art-orbit discover-art-orbit-two" />
        </div>
      </section>

      <section className="discover-library">
        <div className="discover-section-heading">
          <div>
            <span className="discover-section-kicker">THE COLLECTION</span>
            <h2>Explore games</h2>
            <p>Find something new to play.</p>
          </div>

          <span className="discover-results-count">
            {filteredGames.length} results
          </span>
        </div>

        <div className="discover-toolbar">
          <label className="discover-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search games, publishers..."
              aria-label="Search games and publishers"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </label>

          <label className="discover-sort">
            <FontAwesomeIcon icon={faSliders} />

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort games"
            >
              <option value="default">Default order</option>
              <option value="recent">Recently added</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
          </label>
        </div>

        <div className="discover-filters">
          <div className="discover-filter-group">
            <span className="discover-filter-label">PLATFORM</span>

            <div className="discover-filter-options">
              <button
                type="button"
                className={selectedPlatform === "all" ? "active" : ""}
                onClick={() => setSelectedPlatform("all")}
              >
                All platforms
              </button>

              {platforms.map((platform) => (
                <button
                  type="button"
                  key={platform.id}
                  className={
                    selectedPlatform === platform.id ? "active" : ""
                  }
                  onClick={() => setSelectedPlatform(platform.id)}
                >
                  {platform.label}
                </button>
              ))}
            </div>
          </div>

          <div className="discover-filter-group">
            <span className="discover-filter-label">GENRE</span>

            <div className="discover-filter-options">
              <button
                type="button"
                className={selectedGenre === "all" ? "active" : ""}
                onClick={() => setSelectedGenre("all")}
              >
                All genres
              </button>

              {genres.map((genre) => (
                <button
                  type="button"
                  key={genre}
                  className={selectedGenre === genre ? "active" : ""}
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="discover-clear-filters"
              onClick={clearFilters}
            >
              <FontAwesomeIcon icon={faXmark} />
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="discover-state">
            <span className="discover-loader" />
            <p>Discovering games...</p>
          </div>
        ) : error ? (
          <div className="discover-state discover-state-error">
            <FontAwesomeIcon icon={faGamepad} />
            <h3>Something went wrong</h3>
            <p>{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              <FontAwesomeIcon icon={faRotate} />
              Try again
            </button>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="discover-state">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <h3>No games found</h3>
            <p>Try another search or change your filters.</p>

            <button type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="discover-games-grid">
            {filteredGames.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Discover;