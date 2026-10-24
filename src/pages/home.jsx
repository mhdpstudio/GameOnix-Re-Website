import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faGamepad,
  faMobileScreenButton,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";
import {
  faPlaystation,
  faWindows,
  faXbox,
} from "@fortawesome/free-brands-svg-icons";
import GameCard from "../components/GameCard";
import { getGameCategories } from "../utils/game-categories";

import "./../style/home-style.css";

const GAMES_DATA_URL =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/games-data.json";

const GAMES_PER_SECTION = 20;
const NEW_BADGE_DURATION = 24 * 60 * 60 * 1000;

function getAddedAt(game) {
  const value = game?.createdAt;

  if (!value || typeof value !== "string") return null;

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function isNewGame(game, now = Date.now()) {
  const addedAt = getAddedAt(game);

  return (
    addedAt !== null &&
    addedAt <= now &&
    now - addedAt < NEW_BADGE_DURATION
  );
}

function getGameList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.games)) return data.games;
  return [];
}

function compareGameIdsDescending(first, second) {
  const firstId = Number(first?.id);
  const secondId = Number(second?.id);
  const firstHasId = Number.isFinite(firstId);
  const secondHasId = Number.isFinite(secondId);

  if (firstHasId && secondHasId) return secondId - firstId;
  if (firstHasId) return -1;
  if (secondHasId) return 1;
  return 0;
}

function normalizePlatform(value) {
  const platform = String(value || "").trim().toLowerCase();

  if (["pc", "windows", "computer"].includes(platform)) {
    return "pc";
  }

  if (["ps", "playstation", "ps4", "ps5"].includes(platform)) {
    return "ps";
  }

  return platform;
}

function getPlatformInfo(platformId) {
  if (platformId === "pc") {
    return {
      title: "PC Games",
      icon: faWindows,
      description: "Discover games for your PC",
      kicker: "PC GAMING",
    };
  }

  if (platformId === "ps") {
    return {
      title: "PlayStation Games",
      icon: faPlaystation,
      description: "Explore games for PlayStation",
      kicker: "CONSOLE GAMING",
    };
  }

  if (platformId === "xbox") {
    return {
      title: "Xbox Games",
      icon: faXbox,
      description: "Explore games for Xbox",
      kicker: "CONSOLE GAMING",
    };
  }

  if (platformId === "mobile") {
    return {
      title: "Mobile Games",
      icon: faMobileScreenButton,
      description: "Explore games for mobile",
      kicker: "MOBILE GAMING",
    };
  }

  return {
    title: `${platformId.toUpperCase()} Games`,
    icon: faGamepad,
    description: `Explore games for ${platformId.toUpperCase()}`,
    kicker: `${platformId.toUpperCase()} GAMING`,
  };
}

function GamesCarousel({ games, platform, category, now }) {
  const rowRef = useRef(null);

  const visibleGames = games.slice(0, GAMES_PER_SECTION);
  const hasMore = games.length > GAMES_PER_SECTION;
  const isRecentlyAdded = category.id === "recently-added";

  const categoryUrl = isRecentlyAdded
    ? "/games?sort=recent"
    : `/games?platform=${encodeURIComponent(
        platform.id
      )}&type=${encodeURIComponent(category.type)}`;

  const title = isRecentlyAdded
    ? "Recently Added"
    : category.type;

  function scrollRow(direction) {
    if (!rowRef.current) return;

    rowRef.current.scrollBy({
      left:
        direction *
        Math.max(rowRef.current.clientWidth * 0.8, 250),
      behavior: "smooth",
    });
  }

  return (
    <section
      className={
        isRecentlyAdded
          ? "home-category home-recently-added"
          : "home-category"
      }
    >
      <header className="home-category-heading">
        {isRecentlyAdded ? (
          <div className="home-category-title home-category-title-static">
            <span className="home-category-accent" />
            <span>{title}</span>
          </div>
        ) : (
          <Link
            className="home-category-title"
            to={categoryUrl}
            aria-label={`View all ${category.type} games on ${platform.title}`}
          >
            <span className="home-category-accent" />
            <span>{title}</span>

            <span className="home-category-chevron">
              <FontAwesomeIcon icon={faChevronRight} />
            </span>
          </Link>
        )}

        <div className="home-category-actions">
          <Link
            className="home-category-more"
            to={categoryUrl}
          >
            {isRecentlyAdded ? "View all" : "More"}
            <FontAwesomeIcon icon={faChevronRight} />
          </Link>

          <button
            type="button"
            className="home-scroll-button"
            onClick={() => scrollRow(-1)}
            aria-label={`Scroll ${title} games left`}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>

          <button
            type="button"
            className="home-scroll-button"
            onClick={() => scrollRow(1)}
            aria-label={`Scroll ${title} games right`}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </header>

      <div className="home-games-row" ref={rowRef}>
        {visibleGames.map((game) => (
          <GameCard
            key={`${category.id}-${game.id ?? game.slug}`}
            game={game}
            showNewBadge={isNewGame(game, now)}
            className="home-game-card"
          />
        ))}

        {hasMore && (
          <Link
            className="home-more-card"
            to={categoryUrl}
          >
            <span className="home-more-icon">
              <FontAwesomeIcon icon={faChevronRight} />
            </span>

            <strong>More Games</strong>
            <span>View all {games.length} games</span>
          </Link>
        )}
      </div>
    </section>
  );
}

function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(Date.now());

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
          getGameList(data).filter(
            (game) => game?.slug && game?.title
          )
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error loading games:", err);
          setError(
            "Couldn't load games right now. Please try again."
          );
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  const recentlyAddedGames = useMemo(() => {
    return games
      .filter((game) => getAddedAt(game) !== null)
      .slice()
      .sort(compareGameIdsDescending);
  }, [games]);

  const sections = useMemo(() => {
    const platformMap = new Map();

    games.forEach((game) => {
      const platformId = normalizePlatform(game.platform);

      if (!platformId) return;

      if (!platformMap.has(platformId)) {
        platformMap.set(platformId, {
          id: platformId,
          ...getPlatformInfo(platformId),
          categories: new Map(),
        });
      }

      const platformSection = platformMap.get(platformId);
      const types = getGameCategories(game);
      (types.length ? types : ["Other"]).forEach((type) => {
        if (!platformSection.categories.has(type)) {
          platformSection.categories.set(type, []);
        }

        platformSection.categories.get(type).push(game);
      });
    });

    return Array.from(platformMap.values()).map((platformSection) => ({
      ...platformSection,
      categories: Array.from(
        platformSection.categories.entries()
      ).map(([type, items]) => ({
        id: type,
        type,
        games: items.slice().sort(compareGameIdsDescending),
      })),
    }));
  }, [games]);

  if (loading) {
    return (
      <main className="home-page">
        <div className="home-status">
          <span className="home-loader" />
          <p>Loading your games...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="home-page">
        <div className="home-status">
          <p>{error}</p>

          <button
            type="button"
            className="home-retry-button"
            onClick={() => window.location.reload()}
          >
            <FontAwesomeIcon icon={faRotate} />
            Try again
          </button>
        </div>
      </main>
    );
  }

  const recentCategory = {
    id: "recently-added",
    type: "Recently Added",
  };

  return (
    <main className="home-page">
      <section className="home-welcome">
        <div className="home-welcome-copy">
          <span className="home-eyebrow">
            <FontAwesomeIcon icon={faGamepad} />
            YOUR GAMING DESTINATION
          </span>

          <h1>
            Find your next
            <span> adventure.</span>
          </h1>

          <p>
            Explore your library, discover new worlds, and find your
            next favorite game.
          </p>
        </div>

        <div
          className="home-welcome-art"
          aria-hidden="true"
        >
          <FontAwesomeIcon icon={faGamepad} />
        </div>
      </section>

      {recentlyAddedGames.length > 0 && (
        <GamesCarousel
          games={recentlyAddedGames}
          platform={null}
          category={recentCategory}
          now={clock}
        />
      )}

      {sections.map((platformSection) => {
        const totalGames = games.filter(
          (game) =>
            normalizePlatform(game.platform) === platformSection.id
        ).length;

        return (
          <section
            className="home-platform-section"
            key={platformSection.id}
            id={`platform-${platformSection.id}`}
          >
            <header className="home-platform-heading">
              <div>
                <span className="home-platform-kicker">
                  {platformSection.kicker}
                </span>

                <h2>
                  <FontAwesomeIcon
                    className="home-platform-icon"
                    icon={platformSection.icon}
                    aria-hidden="true"
                  />
                  {platformSection.title}
                </h2>
                <p>{platformSection.description}</p>
              </div>

              <Link
                className="home-platform-count"
                to={`/games?platform=${encodeURIComponent(
                  platformSection.id
                )}`}
              >
                {totalGames} games
                <FontAwesomeIcon icon={faChevronRight} />
              </Link>
            </header>

            {platformSection.categories.length === 0 ? (
              <p className="home-empty">
                No games available for this platform yet.
              </p>
            ) : (
              platformSection.categories.map((category) => (
                <GamesCarousel
                  key={`${platformSection.id}-${category.type}`}
                  games={category.games}
                  platform={platformSection}
                  category={category}
                  now={clock}
                />
              ))
            )}
          </section>
        );
      })}
    </main>
  );
}

export default Home;