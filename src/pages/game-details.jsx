import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowLeft,
    faDownload,
    faHeart,
    faBug,
    faGamepad,
    faChevronLeft,
    faChevronRight,
    faTag,
    faCodeBranch,
    faHdd,
    faBuilding,
} from "@fortawesome/free-solid-svg-icons";
import {
    faWindows,
    faPlaystation,
} from "@fortawesome/free-brands-svg-icons";

import {
    getFavorites,
    addFavorite,
    removeFavorite,
} from "../api/favorites";

import "./../style/game-details-style.css";

const DATA_URL =
    "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/games-data.json";

const BANNERS_BASE_URL =
    "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/images/games/banners/";

function getGameList(data) {
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.games) ? data.games : [];
}

function isLoginError(err) {
    const message = String(err?.message || "").toLowerCase();

    return (
        message.includes("log in") ||
        message.includes("login") ||
        message.includes("unauthorized") ||
        message.includes("unauthenticated") ||
        message.includes("401")
    );
}

function GameDetails() {
    const { slug } = useParams();

    const thumbnailsRef = useRef(null);

    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [favorites, setFavorites] = useState([]);
    const [favoritesLoaded, setFavoritesLoaded] = useState(false);
    const [favoriteBusy, setFavoriteBusy] = useState(false);
    const [favoriteError, setFavoriteError] = useState("");
    const [showFavoriteMessage, setShowFavoriteMessage] = useState(false);

    const [selectedImage, setSelectedImage] = useState(0);
    const [failedImages, setFailedImages] = useState([]);
    const [activeTab, setActiveTab] = useState("overview");

    // Load game details.
    useEffect(() => {
        const controller = new AbortController();

        async function loadGame() {
            try {
                setLoading(true);
                setError("");
                setGame(null);
                setFailedImages([]);
                setSelectedImage(0);
                setActiveTab("overview");

                const response = await fetch(DATA_URL, {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error("Couldn't load games.");
                }

                const data = await response.json();

                const found = getGameList(data).find(
                    (item) => item.slug === slug
                );

                if (!found) {
                    throw new Error("Game not found.");
                }

                setGame(found);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err.message || "Something went wrong.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadGame();

        return () => controller.abort();
    }, [slug]);

    // Load favorites from the backend.
    useEffect(() => {
        let active = true;

        async function loadFavorites() {
            setFavoritesLoaded(false);
            setFavoriteError("");
            setShowFavoriteMessage(false);

            try {
                const data = await getFavorites();

                if (active) {
                    setFavorites(
                        Array.isArray(data.favorites)
                            ? data.favorites
                            : []
                    );
                }
            } catch (err) {
                if (active) {
                    setFavorites([]);

                    if (isLoginError(err)) {
                        // Keep the login message hidden until the heart is clicked.
                        setFavoriteError("");
                    } else {
                        setFavoriteError(
                            "Couldn't load favorites. Please try again."
                        );
                    }
                }
            } finally {
                if (active) {
                    setFavoritesLoaded(true);
                }
            }
        }

        loadFavorites();

        return () => {
            active = false;
        };
    }, []);

    // Build screenshot URLs from mediaPrefix and mediaCount.
    const mediaImages = game?.mediaPrefix
        ? Array.from(
              {
                  length: Math.max(
                      0,
                      Math.floor(Number(game.mediaCount) || 0)
                  ),
              },
              (_, index) => ({
                  id: index,
                  src: `${BANNERS_BASE_URL}${game.mediaPrefix}-${index + 1}.webp`,
              })
          ).filter((image) => !failedImages.includes(image.id))
        : [];

    const currentImage =
        mediaImages.find((image) => image.id === selectedImage) ||
        mediaImages[0];

    // Change the main screenshot using the main image arrows.
    function selectRelativeImage(direction) {
        if (!mediaImages.length || !currentImage) return;

        const currentIndex = mediaImages.findIndex(
            (image) => image.id === currentImage.id
        );

        const nextIndex =
            (currentIndex + direction + mediaImages.length) %
            mediaImages.length;

        setSelectedImage(mediaImages[nextIndex].id);
    }

    // Scroll the thumbnails strip only.
    function scrollThumbnails(direction) {
        const container = thumbnailsRef.current;

        if (!container) return;

        const thumbnail = container.querySelector("button");
        const gap = 12;

        const amount = thumbnail
            ? thumbnail.getBoundingClientRect().width + gap
            : 132;

        container.scrollBy({
            left: direction * amount,
            behavior: "smooth",
        });
    }

    // Add or remove a favorite through the backend.
    async function toggleFavorite() {
        if (!game || favoriteBusy) return;

        setFavoriteError("");

        // If favorites couldn't be loaded because the user is logged out,
        // show the message only after the heart is clicked.
        if (!favoritesLoaded) return;

        if (favoriteError) return;

        setShowFavoriteMessage(false);

        const wasFavorite = favorites.includes(game.slug);

        try {
            setFavoriteBusy(true);

            const data = wasFavorite
                ? await removeFavorite(game.slug)
                : await addFavorite(game.slug);

            if (Array.isArray(data.favorites)) {
                setFavorites(data.favorites);
            } else {
                setFavorites((previous) =>
                    wasFavorite
                        ? previous.filter((item) => item !== game.slug)
                        : previous.includes(game.slug)
                          ? previous
                          : [...previous, game.slug]
                );
            }
        } catch (err) {
            console.error("Couldn't update favorites:", err);

            if (isLoginError(err)) {
                setShowFavoriteMessage(true);
            } else {
                setFavoriteError(
                    err.message ||
                        "Couldn't update favorites. Please try again."
                );
            }
        } finally {
            setFavoriteBusy(false);
        }
    }

    function reportBug() {
        if (!game) return;

        const subject = encodeURIComponent(
            `GameOnix bug report: ${game.title}`
        );

        const body = encodeURIComponent(
            `Game: ${game.title}\n` +
                `Slug: ${game.slug}\n\n` +
                "Bug description:\n"
        );

        window.location.href =
            `mailto:?subject=${subject}&body=${body}`;
    }

    if (loading) {
        return (
            <main className="game-page-status">
                <FontAwesomeIcon icon={faGamepad} />
                <p>Loading game...</p>
            </main>
        );
    }

    if (error || !game) {
        return (
            <main className="game-page-status">
                <FontAwesomeIcon icon={faGamepad} />
                <h2>{error || "Game not found"}</h2>
                <Link to="/">Back to Home</Link>
            </main>
        );
    }

    const isFavorite = favorites.includes(game.slug);

    return (
        <main className="game-page">
            <Link to="/" className="game-back">
                <FontAwesomeIcon icon={faArrowLeft} />
                Back to Home
            </Link>

            <header className="game-heading">
                <h1>{game.title}</h1>

                <div className="game-heading-meta">
                    {game.gameType && <span>{game.gameType}</span>}
                    {game.publisher && <span>{game.publisher}</span>}
                    {game.version && (
                        <span>Version {game.version}</span>
                    )}
                </div>
            </header>

            <nav
                className="game-tabs"
                aria-label="Game details sections"
            >
                <button
                    type="button"
                    className={activeTab === "overview" ? "active" : ""}
                    onClick={() => setActiveTab("overview")}
                >
                    Overview
                </button>

                <button
                    type="button"
                    className={activeTab === "addons" ? "active" : ""}
                    onClick={() => setActiveTab("addons")}
                >
                    Add-Ons
                </button>
            </nav>

            {activeTab === "overview" ? (
                <section className="game-layout">
                    <div className="game-gallery">
                        <div className="game-main-image">
                            {currentImage ? (
                                <img
                                    key={currentImage.src}
                                    src={currentImage.src}
                                    alt={`${game.title} screenshot`}
                                    onError={() => {
                                        setFailedImages((previous) =>
                                            previous.includes(currentImage.id)
                                                ? previous
                                                : [...previous, currentImage.id]
                                        );
                                    }}
                                />
                            ) : game.poster ? (
                                <img
                                    src={game.poster}
                                    alt={`${game.title} poster`}
                                />
                            ) : (
                                <div className="game-image-placeholder">
                                    <FontAwesomeIcon icon={faGamepad} />
                                    <span>No screenshots available</span>
                                </div>
                            )}

                            {mediaImages.length > 1 && currentImage && (
                                <>
                                    <button
                                        type="button"
                                        className="gallery-arrow gallery-arrow-left"
                                        aria-label="Previous screenshot"
                                        onClick={() => selectRelativeImage(-1)}
                                    >
                                        <FontAwesomeIcon icon={faChevronLeft} />
                                    </button>

                                    <button
                                        type="button"
                                        className="gallery-arrow gallery-arrow-right"
                                        aria-label="Next screenshot"
                                        onClick={() => selectRelativeImage(1)}
                                    >
                                        <FontAwesomeIcon icon={faChevronRight} />
                                    </button>
                                </>
                            )}
                        </div>

                        {mediaImages.length > 0 && (
                            <div className="game-thumbnails-wrapper">
                                {mediaImages.length > 1 && (
                                    <button
                                        type="button"
                                        className="thumbnail-nav"
                                        aria-label="Scroll thumbnails left"
                                        onClick={() => scrollThumbnails(-1)}
                                    >
                                        <FontAwesomeIcon icon={faChevronLeft} />
                                    </button>
                                )}

                                <div
                                    ref={thumbnailsRef}
                                    className="game-thumbnails"
                                    aria-label="Game screenshots"
                                >
                                    {mediaImages.map((image, index) => (
                                        <button
                                            key={image.id}
                                            type="button"
                                            className={
                                                currentImage?.id === image.id
                                                    ? "selected"
                                                    : ""
                                            }
                                            onClick={() =>
                                                setSelectedImage(image.id)
                                            }
                                            aria-label={`Show screenshot ${index + 1}`}
                                            aria-pressed={
                                                currentImage?.id === image.id
                                            }
                                        >
                                            <img
                                                src={image.src}
                                                alt={`${game.title} screenshot ${index + 1}`}
                                                loading="lazy"
                                            />
                                        </button>
                                    ))}
                                </div>

                                {mediaImages.length > 1 && (
                                    <button
                                        type="button"
                                        className="thumbnail-nav"
                                        aria-label="Scroll thumbnails right"
                                        onClick={() => scrollThumbnails(1)}
                                    >
                                        <FontAwesomeIcon icon={faChevronRight} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <aside className="game-sidebar">
                        <div className="game-logo">
                            {game.game_poster ? (
                                <img
                                    src={game.game_poster}
                                    alt={`${game.title} logo`}
                                />
                            ) : (
                                <h2>{game.title}</h2>
                            )}
                        </div>

                        <div className="game-info-card">
                            <span className="game-info-label">
                                GAME DETAILS
                            </span>

                            <div>
                                <span>
                                    <FontAwesomeIcon icon={faGamepad} /> Platform
                                </span>

                                <strong className="game-platform-value">
                                    {[
                                        "pc",
                                        "windows",
                                        "computer",
                                    ].includes(
                                        String(game.platform || "")
                                            .trim()
                                            .toLowerCase()
                                    ) ? (
                                        <FontAwesomeIcon
                                            icon={faWindows}
                                            title="Windows"
                                            aria-label="Windows"
                                        />
                                    ) : [
                                          "ps",
                                          "playstation",
                                          "ps3",
                                          "ps4",
                                          "ps5",
                                      ].includes(
                                          String(game.platform || "")
                                              .trim()
                                              .toLowerCase()
                                      ) ? (
                                        <FontAwesomeIcon
                                            icon={faPlaystation}
                                            title="PlayStation"
                                            aria-label="PlayStation"
                                        />
                                    ) : (
                                        game.platform || "N/A"
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    <FontAwesomeIcon icon={faTag} /> Genre
                                </span>
                                <strong>{game.gameType || "N/A"}</strong>
                            </div>

                            <div>
                                <span>
                                    <FontAwesomeIcon icon={faCodeBranch} /> Version
                                </span>
                                <strong>{game.version || "N/A"}</strong>
                            </div>

                            <div>
                                <span>
                                    <FontAwesomeIcon icon={faHdd} /> Size
                                </span>
                                <strong>{game.size || "N/A"}</strong>
                            </div>

                            <div>
                                <span>
                                    <FontAwesomeIcon icon={faBuilding} /> Publisher
                                </span>
                                <strong>{game.publisher || "N/A"}</strong>
                            </div>
                        </div>

                        <div className="game-actions-row">
                            {game.gameLink ? (
                                <a
                                    className="game-action game-download"
                                    href={game.gameLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <FontAwesomeIcon icon={faDownload} />
                                    Download Game
                                </a>
                            ) : (
                                <button
                                    type="button"
                                    className="game-action game-download"
                                    disabled
                                >
                                    <FontAwesomeIcon icon={faDownload} />
                                    Download unavailable
                                </button>
                            )}

                            <div className="favorite-button-wrapper">
                                <button
                                    type="button"
                                    className={`game-favorite-icon ${
                                        isFavorite ? "is-favorite" : ""
                                    }`}
                                    onClick={toggleFavorite}
                                    disabled={favoriteBusy}
                                    aria-label={
                                        isFavorite
                                            ? "Remove from favorites"
                                            : "Add to favorites"
                                    }
                                    aria-pressed={isFavorite}
                                    title={
                                        !favoritesLoaded
                                            ? "Loading favorites..."
                                            : isFavorite
                                              ? "Saved to Favorites"
                                              : "Add to Favorites"
                                    }
                                >
                                    <FontAwesomeIcon icon={faHeart} />
                                </button>

                                {showFavoriteMessage && (
                                    <div
                                        className="favorite-login-message"
                                        role="alert"
                                    >
                                        <span>
                                            Please log in to view and manage favorites.
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowFavoriteMessage(false)
                                            }
                                            aria-label="Dismiss message"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {favoriteError && (
                            <p className="favorite-error" role="alert">
                                {favoriteError}
                            </p>
                        )}

                        <button
                            type="button"
                            className="game-action game-report"
                            onClick={reportBug}
                        >
                            <FontAwesomeIcon icon={faBug} />
                            Report a Bug
                        </button>

                        <p className="game-sidebar-note">
                            Check the game details before downloading.
                        </p>
                    </aside>
                </section>
            ) : (
                <section className="game-addons">
                    <h2>Add-Ons</h2>
                    <p>No add-ons are listed for this game yet.</p>
                </section>
            )}
        </main>
    );
}

export default GameDetails;