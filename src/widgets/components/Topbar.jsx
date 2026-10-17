
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
    faMagnifyingGlass,
    faXmark,
    faGamepad,
    faArrowUpRightFromSquare,
    faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import "./../../style/topbar.css";

const GAMES_DATA_URL =
    "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/games-data.json";

function Topbar() {
    const [search, setSearch] = useState("");
    const [games, setGames] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [loadingGames, setLoadingGames] = useState(true);

    const searchRef = useRef(null);
    const searchAreaRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();

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

                setGames(
                    (Array.isArray(list) ? list : []).filter(
                        (game) => game?.slug && game?.title
                    )
                );
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Could not load search data:", error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingGames(false);
                }
            }
        }

        loadGames();

        return () => controller.abort();
    }, []);

    useEffect(() => {
        function handleShortcut(event) {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "k"
            ) {
                event.preventDefault();
                searchRef.current?.focus();
                setSearchOpen(true);
            }

            if (event.key === "Escape") {
                setSearchOpen(false);
                searchRef.current?.blur();
            }
        }

        window.addEventListener("keydown", handleShortcut);

        return () => {
            window.removeEventListener("keydown", handleShortcut);
        };
    }, []);

    useEffect(() => {
        function handleOutsideClick(event) {
            if (
                searchAreaRef.current &&
                !searchAreaRef.current.contains(event.target)
            ) {
                setSearchOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    useEffect(() => {
        setSearchOpen(false);
        setSearch("");
    }, [location.pathname]);

    const query = search.trim();

    const searchResults = query
        ? games
            .filter((game) => {
                const normalizedQuery = query.toLowerCase();

                const title = String(game.title || "").toLowerCase();
                const publisher = String(game.publisher || "").toLowerCase();
                const type = String(game.gameType || "").toLowerCase();

                return (
                    title.includes(normalizedQuery) ||
                    publisher.includes(normalizedQuery) ||
                    type.includes(normalizedQuery)
                );
            })
            .slice(0, 7)
        : [];

    function openFullResults(value = search) {
        const trimmedQuery = value.trim();

        if (!trimmedQuery) {
            searchRef.current?.focus();
            return;
        }

        setSearchOpen(false);
        navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }

    function handleSearchSubmit(event) {
        event.preventDefault();
        openFullResults();
    }

    function clearSearch() {
        setSearch("");
        setSearchOpen(true);
        searchRef.current?.focus();
    }

    return (
        <header className="main-topbar">
            <div className="main-topbar-inner">
                <Link to="/" className="topbar-brand">
                    <span className="topbar-brand-icon">
                        <img
                            src="/logo.png"
                            alt="GameOnix Logo"
                            className="topbar-logo"
                        />
                    </span>

                    <span className="topbar-brand-copy">
                        <strong>GameOnix</strong>
                        <span>Find your next game</span>
                    </span>
                </Link>

                <div
                    className={`topbar-search ${searchOpen ? "is-focused" : ""}`}
                    ref={searchAreaRef}
                >
                    <form
                        className="topbar-search-field"
                        onSubmit={handleSearchSubmit}
                    >
                        <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="topbar-search-icon"
                        />

                        <input
                            ref={searchRef}
                            type="search"
                            value={search}
                            placeholder="Search games, publishers..."
                            aria-label="Search games"
                            aria-expanded={searchOpen && Boolean(query)}
                            onFocus={() => setSearchOpen(true)}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setSearchOpen(true);
                            }}
                        />

                        {search ? (
                            <button
                                type="button"
                                className="topbar-clear-search"
                                onClick={clearSearch}
                                aria-label="Clear search"
                            >
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        ) : (
                            <span className="topbar-shortcut">
                                <kbd>Ctrl</kbd> + <kbd>K</kbd>
                            </span>
                        )}
                    </form>

                    {searchOpen && query && (
                        <div className="topbar-search-dropdown">
                            <div className="search-dropdown-heading">
                                <span>SEARCH RESULTS</span>

                                {!loadingGames && (
                                    <span>
                                        {searchResults.length > 0
                                            ? `${searchResults.length} shown`
                                            : "0 found"}
                                    </span>
                                )}
                            </div>

                            {loadingGames ? (
                                <div className="search-dropdown-message">
                                    Loading games...
                                </div>
                            ) : searchResults.length > 0 ? (
                                <div className="search-results-list">
                                    {searchResults.map((game) => (
                                        <Link
                                            key={game.slug}
                                            to={`/game/${encodeURIComponent(game.slug)}`}
                                            className="search-result-item"
                                            onClick={() => setSearchOpen(false)}
                                        >
                                            <div className="search-result-poster">
                                                {game.poster ? (
                                                    <img
                                                        src={game.poster}
                                                        alt=""
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <FontAwesomeIcon icon={faGamepad} />
                                                )}
                                            </div>

                                            <div className="search-result-info">
                                                <strong>{game.title}</strong>
                                                <span>
                                                    {game.publisher || game.gameType || "Game"}
                                                </span>
                                            </div>

                                            <FontAwesomeIcon
                                                icon={faArrowUpRightFromSquare}
                                                className="search-result-arrow"
                                            />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="search-dropdown-message">
                                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                                    <strong>No games found</strong>
                                    <span>Try another title or publisher.</span>
                                </div>
                            )}

                            <button
                                type="button"
                                className="search-open-full-results"
                                onClick={() => openFullResults()}
                            >
                                <span>
                                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                                    Open full results
                                </span>

                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>

                            <div className="search-dropdown-footer">
                                <span>
                                    <kbd>ENTER</kbd> to see all results
                                </span>

                                <span>
                                    <kbd>ESC</kbd> to close
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="topbar-status">
                    <span className="topbar-status-dot" />
                    <span>Ready to play</span>
                </div>
            </div>
        </header>
    );
}

export default Topbar;
