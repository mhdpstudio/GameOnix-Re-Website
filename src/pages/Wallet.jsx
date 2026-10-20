import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faCircleInfo,
  faRotate,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../api/session";
import "./../style/wallet-style.css";

const WALLET_API_URL =
  "https://gameonix-backend.vercel.app/api/auth/wallet";

function formatBalance(value) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
  }).format(value);
}

function Wallet() {
  const { user, authLoading } = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWallet = useCallback(async () => {
    const response = await authFetch(WALLET_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Unable to load your wallet.");
    }

    if (!Number.isFinite(data.balance) || data.balance < 0) {
      throw new Error("The wallet balance returned by the server is invalid.");
    }

    return data.balance;
  }, []);

  useEffect(() => {
    if (authLoading || !user) return undefined;

    let active = true;

    fetchWallet()
      .then((walletBalance) => {
        if (active) setBalance(walletBalance);
      })
      .catch((loadError) => {
        console.error("Wallet load failed:", loadError);
        if (active) {
          setError(loadError.message || "Unable to load your wallet.");
          setBalance(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, user, fetchWallet]);

  async function refreshWallet() {
    setLoading(true);
    setError("");

    try {
      setBalance(await fetchWallet());
    } catch (loadError) {
      console.error("Wallet load failed:", loadError);
      setError(loadError.message || "Unable to load your wallet.");
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="wallet-page">
      <header className="wallet-heading">
        <span className="wallet-eyebrow">GAMEONIX ACCOUNT</span>
        <h1>Wallet</h1>
        <p>View your current GameOnix wallet balance.</p>
      </header>

      {authLoading ? (
        <div className="wallet-state">Checking your account...</div>
      ) : !user ? (
        <div className="wallet-state">
          <p>Sign in to view your wallet balance.</p>
          <Link className="wallet-primary-link" to="/login">
            Sign in
          </Link>
        </div>
      ) : (
        <div className="wallet-content">
          <article className="wallet-balance-card">
            <div className="wallet-balance-top">
              <span className="wallet-icon">
                <FontAwesomeIcon icon={faWallet} />
              </span>
              <span className="wallet-balance-label">AVAILABLE BALANCE</span>
              <button
                type="button"
                className="wallet-refresh"
                onClick={refreshWallet}
                disabled={loading}
                aria-label="Refresh wallet balance"
                title="Refresh balance"
              >
                <FontAwesomeIcon
                  icon={faRotate}
                  className={loading ? "wallet-spinning" : ""}
                />
              </button>
            </div>

            <strong className="wallet-balance-amount">
              {loading && balance === null
                ? "Loading..."
                : balance === null
                  ? "—"
                  : formatBalance(balance)}
            </strong>
            <span className="wallet-account-name">
              {user.name || user.username}
            </span>
          </article>

          <article className="wallet-funding-card">
            <div className="wallet-funding-icon">
              <FontAwesomeIcon icon={faArrowDown} />
            </div>
            <div className="wallet-funding-copy">
              <h2>Add funds</h2>
              <p>
                Wallet top-ups will be available when a payment provider is
                connected.
              </p>
            </div>
            <button type="button" disabled>
              Coming soon
            </button>
          </article>

          {error && (
            <div className="wallet-message error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={refreshWallet} disabled={loading}>
                Try again
              </button>
            </div>
          )}

          <div className="wallet-note">
            <FontAwesomeIcon icon={faCircleInfo} />
            <span>
              Your balance is read directly from your account record. Contact
              support if it does not look right.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default Wallet;
