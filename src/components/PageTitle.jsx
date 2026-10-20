import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const GAMES_DATA_URL =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/games-data.json";

const pageTitles = {
  "/": "Home",
  "/discover": "Discover Games",
  "/library": "My Library",
  "/login": "Login",
  "/register": "Create Account",
  "/profile": "Your Profile",
  "/wallet": "Wallet",
  "/search": "Search Games",
  "/shopping/game-cards": "Game Cards",
};

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

    // Search page
    if (pathname === "/search") {
      const params = new URLSearchParams(search);
      const query = params.get("q")?.trim();

      title = query
        ? `Search: ${query}`
        : "Search Games";
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
    }

    // Unknown pages
    if (!title) {
      title = "Not Found";
    }

    document.title = `GameOnix | ${title}`;
  }, [pathname, search, games]);

  return null;
}

export default PageTitle;