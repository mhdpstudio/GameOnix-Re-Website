import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const GAMES_DATA_URL =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/games-data.json";

const pageTitles = {
  "/": "Discover and Explore Games",
  "/discover": "Discover Games",
  "/games": "Browse Games",
  "/library": "My Library",
  "/login": "Login",
  "/register": "Create Account",
  "/profile": "Your Profile",
  "/wallet": "Wallet",
  "/request-game": "Request a Game",
  "/search": "Search Games",
  "/shopping/game-cards": "Game Cards",
};

const pageDescriptions = {
  "/": "Discover games, explore PC and PlayStation collections, and build your gaming library with GameOnix.",
  "/discover":
    "Explore the GameOnix game collection and discover games by platform, genre, and category.",
  "/games":
    "Browse the GameOnix collection of PC, PlayStation, and other platform games.",
  "/shopping/game-cards":
    "Explore game cards and digital gaming products available through GameOnix.",
};

const DEFAULT_DESCRIPTION =
  "Discover games, explore PC and PlayStation collections, and build your gaming library with GameOnix.";
const PRIVATE_ROUTES = [
  "/login",
  "/register",
  "/profile",
  "/wallet",
  "/library",
  "/search",
  "/request-game",
  "/shopping/game-cards",
];
const SITE_URL = "https://www.gameonix.shop";

function upsertMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = href;
}

function PageTitle() {
  const { pathname, search } = useLocation();
  const [games, setGames] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGames() {
      try {
        const response = await fetch(GAMES_DATA_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load games");
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : data?.games;

        if (!controller.signal.aborted) {
          setGames(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Could not load game titles:", error);
        }
      }
    }

    loadGames();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    let title = pageTitles[pathname];
    let description = pageDescriptions[pathname] || DEFAULT_DESCRIPTION;
    let canonicalPath = pathname;

    // Search page
    if (pathname === "/search") {
      const params = new URLSearchParams(search);
      const query = params.get("q")?.trim();

      title = query
        ? `Search: ${query}`
        : "Search Games";
      canonicalPath = "/search";
    }

    // Game details page
    if (pathname.startsWith("/game/")) {
      const slug = decodeURIComponent(
        pathname.slice("/game/".length).split("/")[0]
      );

      const game = games.find(
        (item) => String(item.slug || "").toLowerCase() === slug.toLowerCase()
      );

      title = game?.title || "Game Details";
      description = game
        ? `Discover ${game.title} on GameOnix${game.publisher ? `, published by ${game.publisher}` : ""}. Explore game details, platform information, and more.`
        : DEFAULT_DESCRIPTION;
      canonicalPath = `/game/${encodeURIComponent(slug)}`;
    }

    // Unknown pages
    if (!title) {
      title = "Not Found";
    }

    const fullTitle =
      pathname === "/" ? `GameOnix | ${title}` : `${title} | GameOnix`;
    const canonicalUrl = `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath}`;
    const shouldIndex =
      !PRIVATE_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      ) &&
      (!pathname.startsWith("/game/") || Boolean(games.length));
    const robots = shouldIndex
      ? "index, follow, max-image-preview:large"
      : "noindex, nofollow";

    document.title = fullTitle;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertCanonical(canonicalUrl);
  }, [pathname, search, games]);

  return null;
}

export default PageTitle;