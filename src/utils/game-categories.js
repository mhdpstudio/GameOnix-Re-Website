
export function getGameCategories(game) {
  const categories = Array.isArray(game?.gameTypes)
    ? game.gameTypes
    : [game?.gameType];

  return [
    ...new Set(
      categories
        .flatMap((category) =>
          typeof category === "string"
            ? category.split(",")
            : []
        )
        .map((category) =>
          category
            .replace(/\s*\|\s*Old Games/gi, "")
            .trim()
        )
        .filter(Boolean)
    ),
  ];
}

export function gameHasCategory(game, category) {
  return getGameCategories(game).some(
    (gameCategory) =>
      gameCategory.toLowerCase() === String(category).trim().toLowerCase()
  );
}
