
const STORAGE_KEY = "gameonix-saved-games";
const CHANGE_EVENT = "gameonix:saved-games-change";

export function getSavedGames() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function isGameSaved(slug) {
  return getSavedGames().some((game) => game.slug === slug);
}

export function toggleSavedGame(game) {
  if (!game?.slug) return getSavedGames();

  const savedGames = getSavedGames();
  const alreadySaved = savedGames.some(
    (savedGame) => savedGame.slug === game.slug
  );

  const updatedGames = alreadySaved
    ? savedGames.filter((savedGame) => savedGame.slug !== game.slug)
    : [
        ...savedGames,
        {
          ...game,
          poster: game.poster || game.game_poster || "",
        },
      ];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGames));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (error) {
    console.error("Could not save game:", error);
  }

  return updatedGames;
}

export function subscribeSavedGames(callback) {
  const handleChange = () => callback(getSavedGames());

  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}
