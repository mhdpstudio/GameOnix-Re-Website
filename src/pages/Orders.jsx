import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBagShopping,
  faCheck,
  faChevronDown,
  faCircleExclamation,
  faCopy,
  faGamepad,
  faReceipt,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "../context/AuthContext";
import { getCommunityApiToken } from "../api/session";
import {
  PURCHASE_TRANSACTION_TYPE,
  WALLET_API_URL,
  formatOrderAmount,
  formatOrderDate,
  formatOrderDateTime,
  getOrderDestination,
  getOrderFilters,
  toOrder,
} from "../utils/orders";
import "./../style/orders-style.css";

const SKELETON_ROWS = [0, 1, 2, 3, 4];

function OrderThumb({ order }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(order.gameIcon) && !failed;

  return (
    <span className="orders-thumb">
      {showImage ? (
        <img
          src={order.gameIcon}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <FontAwesomeIcon icon={faGamepad} />
      )}
    </span>
  );
}

function CopyButton({ value, label, copiedValue, onCopy }) {
  const copied = copiedValue === value;

  return (
    <button
      type="button"
      className={`orders-copy${copied ? " is-copied" : ""}`}
      onClick={() => onCopy(value)}
      aria-label={copied ? `${label} copied` : label}
      title={label}
    >
      <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

export default function Orders() {
  const { user, authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [copiedValue, setCopiedValue] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const copyTimer = useRef(null);

  useEffect(() => {
    if (!user) return undefined;

    let active = true;

    async function loadOrders() {
      try {
        const token = await getCommunityApiToken();
        const response = await fetch(WALLET_API_URL, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "omit",
        });
        const data = await response.json().catch(() => ({}));

        if (!active) return;

        if (!response.ok) {
          throw new Error(data.error || "Unable to load your orders.");
        }

        const transactions = Array.isArray(data.transactions)
          ? data.transactions
          : [];

        setOrders(
          transactions
            .filter(
              (transaction) =>
                transaction?.type === PURCHASE_TRANSACTION_TYPE
            )
            .map(toOrder)
        );
        setError("");
      } catch (loadError) {
        if (!active) return;

        console.error("Orders load failed:", loadError);
        setOrders([]);
        setError(loadError.message || "Unable to load your orders.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    []
  );

  const filters = useMemo(() => getOrderFilters(orders), [orders]);

  const visibleOrders = useMemo(() => {
    if (activeFilter === "all") return orders;

    return orders.filter((order) => order.statusKey === activeFilter);
  }, [orders, activeFilter]);

  function handleRefresh() {
    setLoading(true);
    setError("");
    setReloadKey((value) => value + 1);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);

      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedValue(""), 2000);
    } catch (copyError) {
      console.error("Copy failed:", copyError);
    }
  }

  function toggleOrder(orderId) {
    setExpandedOrderId((current) => (current === orderId ? "" : orderId));
  }

  if (authLoading) {
    return (
      <section className="orders-page">
        <div className="orders-state" role="status">
          Checking your account...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="orders-page">
        <section className="orders-access-card">
          <span className="orders-access-icon">
            <FontAwesomeIcon icon={faReceipt} />
          </span>

          <h1>My Orders</h1>

          <p>
            Sign in to see the game and gift card purchase requests linked to
            your GameOnix account.
          </p>

          <Link
            className="orders-access-link"
            to="/login"
            state={{ from: "/orders" }}
          >
            Sign in
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </section>
      </section>
    );
  }

  return (
    <section className="orders-page">
      <header className="orders-header">
        <div className="orders-header-copy">
          <h1>My Orders</h1>
          <p>
            Game and gift card purchase requests on your account. Wallet
            top-ups live in your wallet.
          </p>
        </div>

        <button
          type="button"
          className="orders-refresh"
          onClick={handleRefresh}
          disabled={loading}
        >
          <FontAwesomeIcon icon={faRotate} />
          Refresh
        </button>
      </header>

      <section className="orders-board" aria-label="Purchase requests">
        {!loading && !error && orders.length > 0 && (
          <div
            className="orders-filters"
            role="group"
            aria-label="Filter orders by status"
          >
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`orders-filter${
                  activeFilter === filter.key ? " is-active" : ""
                }`}
                aria-pressed={activeFilter === filter.key}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
                <span>{filter.count}</span>
              </button>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="orders-error" role="alert">
            <FontAwesomeIcon icon={faCircleExclamation} />

            <div>
              <strong>Couldn&apos;t load your orders</strong>
              <p>{error}</p>
            </div>

            <button type="button" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        )}

        {loading && (
          <div className="orders-list" aria-hidden="true">
            {SKELETON_ROWS.map((row) => (
              <div className="orders-row is-skeleton" key={row}>
                <div className="orders-skeleton-identity">
                  <span className="orders-skeleton orders-skeleton-thumb" />
                  <span className="orders-skeleton orders-skeleton-line" />
                </div>
                <span className="orders-skeleton orders-skeleton-pill" />
                <span className="orders-skeleton orders-skeleton-line is-short" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="orders-empty">
            <span className="orders-empty-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faBagShopping} />
            </span>

            <h2>No orders yet</h2>
            <p>
              Requests for game packs and gift cards appear here as soon as you
              place them.
            </p>

            <Link
              className="orders-empty-link"
              to="/shopping/game-cards"
            >
              Browse game cards
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && visibleOrders.length === 0 && (
          <div className="orders-empty is-compact">
            <h2>No orders with this status</h2>

            <button
              type="button"
              className="orders-reset-filter"
              onClick={() => setActiveFilter("all")}
            >
              Show all orders
            </button>
          </div>
        )}

        {!loading && !error && visibleOrders.length > 0 && (
          <div className="orders-list">
            {visibleOrders.map((order) => {
              const isOpen = expandedOrderId === order.id;
              const destination = getOrderDestination(order);

              return (
                <article
                  className={`orders-row${isOpen ? " is-open" : ""}`}
                  key={order.id}
                >
                  <button
                    type="button"
                    className="orders-row-summary"
                    aria-expanded={isOpen}
                    onClick={() => toggleOrder(order.id)}
                  >
                    <span className="orders-identity">
                      <OrderThumb order={order} />

                      <span className="orders-identity-copy">
                        <strong>{order.gameName}</strong>

                        <span className="orders-identity-meta">
                          <span>{order.packageName || "Game pack"}</span>
                          <span className="orders-quantity">
                            Qty {order.quantity}
                          </span>
                        </span>
                      </span>
                    </span>

                    <span
                      className={`orders-status is-${order.statusKey}`}
                    >
                      {order.statusLabel}
                    </span>

                    <span className="orders-amount">
                      {formatOrderAmount(order.amount)}
                    </span>

                    <span className="orders-date">
                      {formatOrderDate(order.createdAt)}
                    </span>

                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className="orders-chevron"
                    />
                  </button>

                  {isOpen && (
                    <div className="orders-detail">
                      <dl className="orders-detail-grid">
                        <div>
                          <dt>Request ID</dt>
                          <dd className="orders-detail-id">
                            <code>{order.id}</code>
                            <CopyButton
                              value={order.id}
                              label="Copy order ID"
                              copiedValue={copiedValue}
                              onCopy={copyText}
                            />
                          </dd>
                        </div>

                        <div>
                          <dt>{destination.label}</dt>
                          <dd>
                            {destination.value || "Not provided"}
                          </dd>
                        </div>

                        {order.serverId && (
                          <div>
                            <dt>Server</dt>
                            <dd>{order.serverId}</dd>
                          </div>
                        )}

                        <div>
                          <dt>Quantity</dt>
                          <dd>{order.quantity}</dd>
                        </div>

                        <div>
                          <dt>Payment method</dt>
                          <dd>
                            {order.paymentMethod || "Not provided"}
                            {order.walletPayment && (
                              <span className="orders-tag">
                                Wallet funds
                              </span>
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt>Amount</dt>
                          <dd>{formatOrderAmount(order.amount)}</dd>
                        </div>

                        <div>
                          <dt>Placed</dt>
                          <dd>{formatOrderDateTime(order.createdAt)}</dd>
                        </div>
                      </dl>

                      {order.giftCardCodes.length > 0 && (
                        <section className="orders-codes">
                          <h3>Delivered codes</h3>

                          <ul>
                            {order.giftCardCodes.map((code, index) => (
                              <li key={`${code}-${index}`}>
                                <span className="orders-code-value">
                                  {code}
                                </span>

                                <CopyButton
                                  value={code}
                                  label="Copy code"
                                  copiedValue={copiedValue}
                                  onCopy={copyText}
                                />
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      <div className="orders-detail-footer">
                        <Link
                          className="orders-support-link"
                          to={`/support?order=${encodeURIComponent(order.id)}`}
                        >
                          Contact support
                        </Link>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
