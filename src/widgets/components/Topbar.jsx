
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBell,
    faChevronDown,
    faCircleUser,
    faGear,
    faCreditCard,
    faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext";

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
const AUTH_API_URL = "https://gameonix-backend.vercel.app/api/auth/me";
const WALLET_NOTIFICATIONS_URL =
    "https://gameonixfav.vercel.app/api/auth/wallet-notifications";
const PAYMENTS_URL =
    "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/payments.json";

async function getWalletApiToken() {
    const response = await fetch(`${AUTH_API_URL}?token=true`, {
        headers: { Accept: "application/json" },
        credentials: "include",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || typeof data.token !== "string") {
        throw new Error(data.error || "Your session expired. Sign in again.");
    }

    return data.token;
}

function TopbarAvatar({ avatar, name }) {
    const [failed, setFailed] = useState(false);

    if (!avatar || failed) {
        return <FontAwesomeIcon icon={faCircleUser} />;
    }

    return (
        <img
            src={avatar}
            alt=""
            onError={() => setFailed(true)}
            title={name}
        />
    );
}

function Topbar() {
    const [search, setSearch] = useState("");
    const [games, setGames] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [loadingGames, setLoadingGames] = useState(true);
    const [openAccountPanel, setOpenAccountPanel] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedNotificationId, setSelectedNotificationId] = useState(null);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsError, setNotificationsError] = useState("");
    const [notificationsOwner, setNotificationsOwner] = useState("");
    const [notificationsErrorOwner, setNotificationsErrorOwner] = useState("");
    const [notificationActionLoading, setNotificationActionLoading] =
        useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState("");

    const searchRef = useRef(null);
    const searchAreaRef = useRef(null);
    const accountActionsRef = useRef(null);
    const activeUsernameRef = useRef(null);

    const navigate = useNavigate();
    const { user, authLoading, logout } = useAuth();

    const visibleNotifications =
        notificationsOwner === user?.username ? notifications : [];
    const visibleNotificationsError =
        notificationsErrorOwner === user?.username ? notificationsError : "";
    const unreadCount = visibleNotifications.filter(
        (notification) => !notification.readAt
    ).length;

    const loadNotifications = useCallback(async () => {
        if (!user) return;

        setNotificationsLoading(true);
        setNotificationsError("");
        try {
            const token = await getWalletApiToken();
            const response = await fetch(WALLET_NOTIFICATIONS_URL, {
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: "omit",
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !Array.isArray(data.notifications)) {
                throw new Error(
                    data.error || "Unable to load your notifications."
                );
            }

            if (activeUsernameRef.current !== user.username) return;
            setNotifications(data.notifications);
            setNotificationsOwner(user.username);
        } catch (error) {
            if (activeUsernameRef.current !== user.username) return;
            console.error("Wallet notifications load failed:", error);
            setNotificationsError(
                error.message || "Unable to load your notifications."
            );
            setNotificationsErrorOwner(user.username);
        } finally {
            if (activeUsernameRef.current === user.username) {
                setNotificationsLoading(false);
            }
        }
    }, [user]);

    async function markNotificationRead(notification) {
        setSelectedNotificationId(notification.id);
        if (notification.readAt) return;

        setNotificationActionLoading(true);
        setNotificationsError("");
        try {
            const token = await getWalletApiToken();
            const response = await fetch(WALLET_NOTIFICATIONS_URL, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: "omit",
                body: JSON.stringify({ notificationId: notification.id }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || "Unable to update notification.");
            }

            setNotifications((current) =>
                current.map((item) =>
                    item.id === notification.id
                        ? { ...item, readAt: new Date().toISOString() }
                        : item
                )
            );
        } catch (error) {
            console.error("Wallet notification update failed:", error);
            setNotificationsError(
                error.message || "Unable to update notification."
            );
            setNotificationsErrorOwner(user?.username || "");
        } finally {
            setNotificationActionLoading(false);
        }
    }

    async function markAllNotificationsRead() {
        if (!unreadCount) return;

        setNotificationActionLoading(true);
        setNotificationsError("");
        try {
            const token = await getWalletApiToken();
            const response = await fetch(WALLET_NOTIFICATIONS_URL, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: "omit",
                body: JSON.stringify({ markAll: true }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || "Unable to update notifications.");
            }

            const readAt = new Date().toISOString();
            setNotifications((current) =>
                current.map((item) => ({ ...item, readAt: item.readAt || readAt }))
            );
        } catch (error) {
            console.error("Wallet notifications update failed:", error);
            setNotificationsError(
                error.message || "Unable to update notifications."
            );
            setNotificationsErrorOwner(user?.username || "");
        } finally {
            setNotificationActionLoading(false);
        }
    }

    async function handleLogout() {
        if (loggingOut) return;

        setLoggingOut(true);
        setLogoutError("");
        try {
            await logout();
            setOpenAccountPanel(null);
            navigate("/login", { replace: true });
        } catch (error) {
            console.error("Logout failed:", error);
            setLogoutError("Couldn't sign out. Please try again.");
        } finally {
            setLoggingOut(false);
        }
    }

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
        let active = true;

        async function loadPaymentMethods() {
            try {
                const response = await fetch(PAYMENTS_URL, {
                    cache: "no-cache",
                });
                if (!response.ok) {
                    throw new Error(
                        `Payment methods request failed (${response.status}).`
                    );
                }

                const data = await response.json();
                if (
                    !Array.isArray(data) ||
                    data.some(
                        (method) =>
                            !method ||
                            typeof method.name !== "string" ||
                            typeof method.logo !== "string"
                    )
                ) {
                    throw new Error("Unexpected payment methods format.");
                }

                if (active) setPaymentMethods(data);
            } catch (error) {
                console.error("Topbar payment methods load failed:", error);
            }
        }

        loadPaymentMethods();
        return () => {
            active = false;
        };
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
                setOpenAccountPanel(null);
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
                setSearch("");
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    useEffect(() => {
        activeUsernameRef.current = user?.username || null;

        if (authLoading || !user) return undefined;

        const initialLoad = window.setTimeout(loadNotifications, 0);
        const interval = window.setInterval(loadNotifications, 60_000);
        window.addEventListener("wallet-notifications-updated", loadNotifications);
        return () => {
            window.clearTimeout(initialLoad);
            window.clearInterval(interval);
            window.removeEventListener(
                "wallet-notifications-updated",
                loadNotifications
            );
        };
    }, [user, authLoading, loadNotifications]);

    useEffect(() => {
        function handleAccountPanelOutsideClick(event) {
            if (
                accountActionsRef.current &&
                !accountActionsRef.current.contains(event.target)
            ) {
                setOpenAccountPanel(null);
            }
        }

        document.addEventListener("mousedown", handleAccountPanelOutsideClick);
        return () =>
            document.removeEventListener(
                "mousedown",
                handleAccountPanelOutsideClick
            );
    }, []);

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
        setSearch("");
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
                                            onClick={() => {
                                                setSearchOpen(false);
                                                setSearch("");
                                            }}
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

                <div className="topbar-status has-account-actions">
                    <div className="topbar-account-actions" ref={accountActionsRef}>
                            <div className="topbar-account-action-wrap">
                                <button
                                    type="button"
                                    className={`topbar-notifications-trigger${openAccountPanel === "notifications" ? " active" : ""}`}
                                    aria-label={
                                        unreadCount
                                            ? `Notifications, ${unreadCount} unread`
                                            : "Notifications"
                                    }
                                    aria-expanded={openAccountPanel === "notifications"}
                                    aria-haspopup="dialog"
                                    onClick={() => {
                                        const opening =
                                            openAccountPanel !== "notifications";
                                        setOpenAccountPanel(
                                            opening ? "notifications" : null
                                        );
                                        if (opening && user) loadNotifications();
                                    }}
                                >
                                    <FontAwesomeIcon icon={faBell} />
                                    {unreadCount > 0 && (
                                        <span className="topbar-notification-dot" />
                                    )}
                                </button>
                                {openAccountPanel === "notifications" && (
                                    <section
                                        className="topbar-account-popover topbar-notifications-popover"
                                        role="dialog"
                                        aria-label="Notifications"
                                    >
                                        {authLoading ? (
                                            <div className="topbar-notification-state">
                                                Checking your account...
                                            </div>
                                        ) : !user ? (
                                            <>
                                                <header className="topbar-popover-heading">
                                                    <div>
                                                        <strong>Notifications</strong>
                                                        <span>Wallet updates and account activity</span>
                                                    </div>
                                                </header>
                                                <div className="topbar-notification-state">
                                                    <FontAwesomeIcon icon={faBell} />
                                                    <strong>Sign in to view notifications</strong>
                                                    <span>
                                                        Sign in or create an account to keep up with your wallet activity.
                                                    </span>
                                                    <Link
                                                        className="topbar-auth-link"
                                                        to="/login"
                                                        onClick={() => setOpenAccountPanel(null)}
                                                    >
                                                        Sign in / Create account
                                                    </Link>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                        <header className="topbar-popover-heading">
                                            <div>
                                                <strong>Notifications</strong>
                                                <span>
                                                    Wallet updates · kept for 7 days
                                                </span>
                                            </div>
                                            {unreadCount > 0 && (
                                                <button
                                                    type="button"
                                                    className="topbar-mark-all-read"
                                                    onClick={markAllNotificationsRead}
                                                    disabled={
                                                        notificationActionLoading
                                                    }
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </header>
                                        {visibleNotificationsError ? (
                                            <div
                                                className="topbar-notification-state error"
                                                role="alert"
                                            >
                                                <span>
                                                    {visibleNotificationsError}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={loadNotifications}
                                                >
                                                    Try again
                                                </button>
                                            </div>
                                        ) : notificationsLoading &&
                                          visibleNotifications.length === 0 ? (
                                            <div
                                                className="topbar-notification-state"
                                                role="status"
                                            >
                                                Loading notifications...
                                            </div>
                                        ) : visibleNotifications.length === 0 ? (
                                            <div className="topbar-notification-state">
                                                <FontAwesomeIcon icon={faBell} />
                                                <strong>You’re all caught up</strong>
                                                <span>
                                                    Wallet activity will appear here.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="topbar-notification-list">
                                                {visibleNotifications.map((notification) => {
                                                    const isSelected =
                                                        selectedNotificationId === notification.id;
                                                    const details = notification.details;
                                                    const paymentMethod = paymentMethods.find(
                                                        (method) =>
                                                            method.name === details?.paymentMethod
                                                    );
                                                    const statusLabel = {
                                                        pending: "Awaiting admin response",
                                                        approved: "Approved",
                                                        cancelled: "Cancelled",
                                                    }[details?.status] || "Status unavailable";

                                                    return (
                                                        <article
                                                            className={`topbar-notification-card${notification.readAt ? "" : " unread"}${isSelected ? " expanded" : ""}`}
                                                            key={notification.id}
                                                        >
                                                            <button
                                                                className="topbar-notification-item"
                                                                type="button"
                                                                aria-expanded={isSelected}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setSelectedNotificationId(null);
                                                                    } else {
                                                                        markNotificationRead(notification);
                                                                    }
                                                                }}
                                                                disabled={notificationActionLoading}
                                                            >
                                                                <span className="topbar-notification-item-icon">
                                                                    {paymentMethod?.logo ? (
                                                                        <img
                                                                            src={paymentMethod.logo}
                                                                            alt=""
                                                                        />
                                                                    ) : (
                                                                        <FontAwesomeIcon icon={faCreditCard} />
                                                                    )}
                                                                </span>
                                                                <span className="topbar-notification-copy">
                                                                    <strong>{notification.title}</strong>
                                                                    <span>{notification.message}</span>
                                                                    <small>
                                                                        {new Date(
                                                                            notification.createdAt
                                                                        ).toLocaleString("en-EG", {
                                                                            dateStyle: "medium",
                                                                            timeStyle: "short",
                                                                        })}
                                                                    </small>
                                                                </span>
                                                                {!notification.readAt && (
                                                                    <span
                                                                        className="topbar-notification-unread-dot"
                                                                        aria-label="Unread"
                                                                    />
                                                                )}
                                                                <FontAwesomeIcon
                                                                    icon={faChevronDown}
                                                                    className={`topbar-notification-chevron${isSelected ? " expanded" : ""}`}
                                                                />
                                                            </button>
                                                            {isSelected && (
                                                                <div className="topbar-notification-details">
                                                                    {details ? (
                                                                        <>
                                                                            <div className="topbar-notification-detail-row amount">
                                                                                <span>Requested amount</span>
                                                                                <strong>
                                                                                    {Number.isFinite(Number(details.amount))
                                                                                        ? `EGP ${Number(details.amount).toFixed(2)}`
                                                                                        : "Amount unavailable"}
                                                                                </strong>
                                                                            </div>
                                                                            <div className="topbar-notification-detail-row">
                                                                                <span>Payment method</span>
                                                                                <strong>{details.paymentMethod || "Not provided"}</strong>
                                                                            </div>
                                                                            <div className="topbar-notification-detail-row">
                                                                                <span>Email</span>
                                                                                {details.email &&
                                                                                details.email !== "Not provided" &&
                                                                                details.email !== "Not available" ? (
                                                                                    <a href={`mailto:${details.email}`}>
                                                                                        {details.email}
                                                                                    </a>
                                                                                ) : (
                                                                                    <strong>Not provided</strong>
                                                                                )}
                                                                            </div>
                                                                            <div className="topbar-notification-detail-row">
                                                                                <span>Mobile number</span>
                                                                                {details.mobileNumber &&
                                                                                details.mobileNumber !== "Not required" &&
                                                                                details.mobileNumber !== "Not provided" ? (
                                                                                    <a href={`tel:${details.mobileNumber}`}>
                                                                                        {details.mobileNumber}
                                                                                    </a>
                                                                                ) : (
                                                                                    <strong>{details.mobileNumber || "Not provided"}</strong>
                                                                                )}
                                                                            </div>
                                                                            <div className="topbar-notification-detail-row">
                                                                                <span>WhatsApp</span>
                                                                                {details.whatsappNumber &&
                                                                                details.whatsappNumber !== "Not provided" ? (
                                                                                    <a href={`https://wa.me/${String(details.whatsappNumber).replace(/[^\d]/g, "")}`}>
                                                                                        {details.whatsappNumber}
                                                                                    </a>
                                                                                ) : (
                                                                                    <strong>Not provided</strong>
                                                                                )}
                                                                            </div>
                                                                            <div className={`topbar-notification-status ${details.status || "unknown"}`}>
                                                                                <span className="topbar-notification-status-dot" />
                                                                                {statusLabel}
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <p>
                                                                            Request details are unavailable for this older notification.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        )}
                                            </>
                                        )}
                                    </section>
                                )}
                            </div>

                            <span className="topbar-account-divider" aria-hidden="true" />

                            <div className="topbar-account-action-wrap">
                                <button
                                    type="button"
                                    className={`topbar-profile-trigger${openAccountPanel === "profile" ? " active" : ""}`}
                                    aria-label={user ? "Open profile menu" : "Sign in to your account"}
                                    aria-expanded={openAccountPanel === "profile"}
                                    aria-haspopup={user ? "menu" : "dialog"}
                                    onClick={() =>
                                        setOpenAccountPanel((current) =>
                                            current === "profile"
                                                ? null
                                                : "profile"
                                        )
                                    }
                                >
                                    <span className="topbar-profile-avatar">
                                        {user ? (
                                            <TopbarAvatar
                                                key={user.avatar || user.username}
                                                avatar={user.avatar}
                                                name={user.name || user.username}
                                            />
                                        ) : (
                                            <FontAwesomeIcon icon={faCircleUser} />
                                        )}
                                    </span>
                                    {user && (
                                        <span className="topbar-profile-name">
                                            {user.name || user.username}
                                        </span>
                                    )}
                                    <FontAwesomeIcon
                                        icon={faChevronDown}
                                        className="topbar-profile-chevron"
                                    />
                                </button>
                                {openAccountPanel === "profile" && user && (
                                    <nav
                                        className="topbar-account-popover topbar-profile-popover"
                                        role="menu"
                                        aria-label="Profile menu"
                                    >
                                        <div className="topbar-profile-menu-user">
                                            <strong>
                                                {user.name || user.username}
                                            </strong>
                                            <span>@{user.username}</span>
                                        </div>
                                        <Link
                                            to="/profile"
                                            role="menuitem"
                                            onClick={() =>
                                                setOpenAccountPanel(null)
                                            }
                                        >
                                            <FontAwesomeIcon icon={faGear} />
                                            <span>Profile settings</span>
                                        </Link>
                                    </nav>
                                )}
                                {openAccountPanel === "profile" && !user && (
                                    <section
                                        className="topbar-account-popover topbar-profile-popover topbar-guest-profile-popover"
                                        role="dialog"
                                        aria-label="Profile"
                                    >
                                        {logoutError && (
                                            <p
                                                className="topbar-logout-error"
                                                role="alert"
                                            >
                                                {logoutError}
                                            </p>
                                        )}
                                        {authLoading ? (
                                            <div className="topbar-notification-state">
                                                Checking your account...
                                            </div>
                                        ) : (
                                            <>
                                                <div className="topbar-profile-menu-user">
                                                    <strong>Your GameOnix profile</strong>
                                                    <span>Sign in to manage your account and settings.</span>
                                                </div>
                                                <Link
                                                    to="/login"
                                                    className="topbar-auth-link"
                                                    onClick={() => setOpenAccountPanel(null)}
                                                >
                                                    Sign in / Create account
                                                </Link>
                                            </>
                                        )}
                                    </section>
                                )}
                            </div>
                            {user && (
                                <>
                                    <span className="topbar-account-divider" aria-hidden="true" />
                                    <button
                                        type="button"
                                        className="topbar-signout-trigger"
                                        onClick={handleLogout}
                                        disabled={loggingOut}
                                        aria-label={loggingOut ? "Signing out" : "Sign out"}
                                        title={loggingOut ? "Signing out..." : "Sign out"}
                                    >
                                        <FontAwesomeIcon icon={faRightFromBracket} />
                                    </button>
                                </>
                            )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Topbar;
