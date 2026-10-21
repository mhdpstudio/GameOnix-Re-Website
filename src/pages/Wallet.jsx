import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faCircleInfo,
  faRotate,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import "./../style/wallet-style.css";

const AUTH_API_URL = "https://gameonix-backend.vercel.app/api/auth/me";
const WALLET_API_URL =
  "https://gameonixfav.vercel.app/api/auth/wallet";
const PAYMENTS_URL =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/payments.json";

function formatBalance(value) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
  }).format(value);
}

function getTransactionDescription(transaction) {
  const details = getTopUpDetails(transaction);
  if (details) return `Top-up request · ${details.paymentMethod || "Payment method"}`;

  return transaction.description || "Wallet transaction";
}

function getTopUpDetails(transaction) {
  if (transaction.type !== "top_up_request") return null;
  return getTransactionDetails(transaction);
}

function getTransactionDetails(transaction) {
  if (!transaction.description.startsWith("{")) return null;
  try {
    const details = JSON.parse(transaction.description);
    return details && typeof details === "object" ? details : null;
  } catch {
    return null;
  }
}

function formatTransactionDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function Wallet() {
  const { user, authLoading } = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [cancellingRequestId, setCancellingRequestId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastWarning, setToastWarning] = useState(false);
  const paymentDropdownRef = useRef(null);
  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.name === paymentMethod
  );

  useEffect(() => {
    let active = true;

    async function loadPaymentMethods() {
      try {
        const response = await fetch(PAYMENTS_URL, { cache: "no-cache" });

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
              typeof method.av !== "boolean" ||
              typeof method["mobile-number"] !== "boolean"
          )
        ) {
          throw new Error("Unexpected payment methods format.");
        }

        const availableMethods = data.filter((method) => method.av);
        if (active) {
          setPaymentMethods(availableMethods);
          setPaymentMethod(availableMethods[0]?.name || "");
        }
      } catch (loadError) {
        console.error("Wallet payment methods load failed:", loadError);
        if (active) {
          setPaymentMethodsError(
            "Unable to load available payment methods. Please try again."
          );
        }
      } finally {
        if (active) setPaymentMethodsLoading(false);
      }
    }

    loadPaymentMethods();

    return () => {
      active = false;
    };
  }, []);

  const fetchWallet = useCallback(async () => {
    const tokenResponse = await fetch(`${AUTH_API_URL}?token=true`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });

    const tokenData = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok || typeof tokenData.token !== "string") {
      throw new Error(
        tokenData.error || "Your session expired. Sign in again to view your wallet."
      );
    }

    const response = await fetch(WALLET_API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tokenData.token}`,
      },
      credentials: "omit",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Unable to load your wallet.");
    }

    if (
      !Number.isFinite(data.balance) ||
      data.balance < 0 ||
      !Array.isArray(data.transactions)
    ) {
      throw new Error("The wallet balance returned by the server is invalid.");
    }

    return { balance: data.balance, transactions: data.transactions };
  }, []);

  useEffect(() => {
    if (authLoading || !user) return undefined;

    let active = true;

    fetchWallet()
      .then((wallet) => {
        if (active) {
          setBalance(wallet.balance);
          setTransactions(wallet.transactions);
        }
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
      const wallet = await fetchWallet();
      setBalance(wallet.balance);
      setTransactions(wallet.transactions);
    } catch (loadError) {
      console.error("Wallet load failed:", loadError);
      setError(loadError.message || "Unable to load your wallet.");
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!topUpOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setTopUpOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [topUpOpen]);

  useEffect(() => {
    if (!paymentDropdownOpen) return undefined;

    function closeDropdown(event) {
      if (!paymentDropdownRef.current?.contains(event.target)) {
        setPaymentDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, [paymentDropdownOpen]);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timeout = window.setTimeout(() => setToastMessage(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  async function cancelTopUpRequest(transaction) {
    const confirmed = window.confirm(
      "Cancel this pending top-up request? This cannot be undone."
    );
    if (!confirmed) return;

    setCancellingRequestId(transaction.id);
    try {
      const tokenResponse = await fetch(`${AUTH_API_URL}?token=true`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || typeof tokenData.token !== "string") {
        throw new Error(
          tokenData.error ||
            "Your session expired. Sign in again to cancel this request."
        );
      }

      const response = await fetch(WALLET_API_URL, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.token}`,
        },
        credentials: "omit",
        body: JSON.stringify({ requestId: transaction.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to cancel this request.");
      }

      setTransactions((current) =>
        current.map((item) =>
          item.id === transaction.id ? { ...item, status: "cancelled" } : item
        )
      );
      setToastMessage(
        data.notificationSent
          ? "Your request was cancelled and the admin was notified."
          : "Your request was cancelled, but the admin notification could not be sent. Please contact support."
      );
      setToastWarning(!data.notificationSent);
    } catch (cancelError) {
      console.error("Wallet top-up request cancellation failed:", cancelError);
      setToastMessage(
        cancelError.message || "Unable to cancel this request. Please try again."
      );
      setToastWarning(true);
    } finally {
      setCancellingRequestId(null);
    }
  }

  async function submitTopUpRequest(event) {
    event.preventDefault();
    setRequestError("");

    const requestedAmount = Number(amount);
    if (
      !Number.isFinite(requestedAmount) ||
      requestedAmount < 1 ||
      requestedAmount > 100000
    ) {
      setRequestError("Enter an amount between EGP 1 and EGP 100,000.");
      return;
    }

    if (!selectedPaymentMethod) {
      setRequestError("Choose an available payment method.");
      return;
    }

    if (
      selectedPaymentMethod["mobile-number"] &&
      !mobileNumber.trim()
    ) {
      setRequestError("Enter the mobile number used for payment.");
      return;
    }

    if (!/^[+\d][\d\s()-]{5,28}$/.test(whatsappNumber.trim())) {
      setRequestError("Enter a valid WhatsApp contact number.");
      return;
    }

    setRequestLoading(true);

    try {
      const tokenResponse = await fetch(`${AUTH_API_URL}?token=true`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const tokenData = await tokenResponse.json().catch(() => ({}));

      if (!tokenResponse.ok || typeof tokenData.token !== "string") {
        throw new Error(
          tokenData.error ||
            "Your session expired. Sign in again to send a request."
        );
      }

      const response = await fetch(WALLET_API_URL, {
        method: editingRequestId ? "PUT" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.token}`,
        },
        credentials: "omit",
        body: JSON.stringify({
          ...(editingRequestId ? { requestId: editingRequestId } : {}),
          amount: requestedAmount,
          paymentMethod: selectedPaymentMethod.name,
          mobileNumber,
          whatsappNumber,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            (editingRequestId
              ? "Unable to update your top-up request."
              : "Unable to send your top-up request.")
        );
      }

      setTopUpOpen(false);
      setPaymentDropdownOpen(false);
      if (editingRequestId) {
        setTransactions((current) =>
          current.map((transaction) =>
            transaction.id === editingRequestId
              ? data.request
              : transaction
          )
        );
        setToastMessage(
          data.notificationSent
            ? "Your request was updated and the admin was notified."
            : "Your request was updated, but the admin notification could not be sent. Please contact support."
        );
        setToastWarning(!data.notificationSent);
      } else {
        setTransactions((current) => [
          {
            id: data.requestId,
            type: "top_up_request",
            description: JSON.stringify({
              currentBalance: balance,
              paymentMethod: selectedPaymentMethod.name,
              mobileNumber: selectedPaymentMethod["mobile-number"]
                ? mobileNumber.trim()
                : "Not required",
              whatsappNumber: whatsappNumber.trim(),
            }),
            amount: requestedAmount,
            status: "pending",
            createdAt: new Date().toISOString(),
          },
          ...current,
        ]);
        setToastMessage("Your top-up request was sent successfully.");
        setToastWarning(false);
      }
      setEditingRequestId(null);
      setAmount("");
      setMobileNumber("");
      setWhatsappNumber("");
    } catch (submitError) {
      console.error("Wallet top-up request failed:", submitError);
      setRequestError(
        submitError.message || "Unable to send your request. Please try again."
      );
    } finally {
      setRequestLoading(false);
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
            <div className="wallet-funding-title">
              <span className="wallet-funding-icon">
                <FontAwesomeIcon icon={faArrowDown} />
              </span>
              <div className="wallet-funding-copy">
                <h2>Add funds</h2>
                <p>Send a top-up request to the admin for review.</p>
              </div>
            </div>
            <button
              className="wallet-submit"
              type="button"
              onClick={() => {
                setRequestError("");
                setEditingRequestId(null);
                setAmount("");
                setMobileNumber("");
                setWhatsappNumber("");
                setTopUpOpen(true);
              }}
            >
              Add funds
            </button>
          </article>

          <section
            className="wallet-history"
            aria-busy={loading && transactions.length === 0}
          >
            <div className="wallet-history-heading">
              <div>
                <span className="wallet-eyebrow">ACCOUNT ACTIVITY</span>
                <h2>Wallet statement</h2>
              </div>
              <span>
                {loading && transactions.length === 0
                  ? "Loading..."
                  : `${transactions.length} transactions`}
              </span>
            </div>

            {loading && transactions.length === 0 ? (
              <div
                className="wallet-history-loading"
                role="status"
                aria-label="Loading wallet statement"
              >
                <span className="wallet-history-loading-message">
                  Loading your wallet activity...
                </span>
                {[0, 1, 2].map((row) => (
                  <div className="wallet-history-skeleton" key={row}>
                    <span className="wallet-skeleton-icon" />
                    <span className="wallet-skeleton-copy">
                      <span />
                      <span />
                    </span>
                    <span className="wallet-skeleton-amount" />
                  </div>
                ))}
              </div>
            ) : error && transactions.length === 0 ? (
              <div className="wallet-empty-history">
                Unable to load wallet activity. Please try again.
              </div>
            ) : transactions.length === 0 ? (
              <div className="wallet-empty-history">
                No wallet activity yet. Top-up requests will appear here;
                purchases will show after wallet checkout is connected.
              </div>
            ) : (
              <div className="wallet-transaction-list">
                {transactions.map((transaction) => {
                  const details = getTransactionDetails(transaction);
                  const paymentMethod = paymentMethods.find(
                    (method) => method.name === details?.paymentMethod
                  );

                  return (
                    <article
                      className="wallet-transaction"
                      key={transaction.id}
                    >
                      <span
                        className={`wallet-transaction-icon ${transaction.type}`}
                        title={paymentMethod?.name || "Wallet transaction"}
                        aria-label={
                          paymentMethod
                            ? `${paymentMethod.name} payment`
                            : "Wallet transaction"
                        }
                      >
                        {paymentMethod?.logo && (
                          <img
                            className="wallet-transaction-payment-logo"
                            src={paymentMethod.logo}
                            alt=""
                            aria-hidden="true"
                            onError={(event) => {
                              event.currentTarget.hidden = true;
                              event.currentTarget.nextElementSibling.hidden = false;
                            }}
                          />
                        )}
                        <FontAwesomeIcon
                          icon={faWallet}
                          hidden={Boolean(paymentMethod?.logo)}
                        />
                      </span>
                      <div className="wallet-transaction-details">
                        <strong>
                          {getTransactionDescription(transaction)}
                        </strong>
                        {transaction.type === "top_up_request" && details && (
                          <span>
                            Request {transaction.id.slice(0, 8)} · WhatsApp{" "}
                            {details.whatsappNumber || "not provided"}
                          </span>
                        )}
                        <span>
                          {formatTransactionDate(transaction.createdAt)}
                        </span>
                      </div>
                      <div className="wallet-transaction-amount">
                        <strong>{formatBalance(transaction.amount)}</strong>
                        <span className={`wallet-status ${transaction.status}`}>
                          {transaction.status.replaceAll("_", " ")}
                        </span>
                        {transaction.type === "top_up_request" &&
                          transaction.status === "pending" && (
                            <div className="wallet-request-actions">
                              <button
                                className="wallet-edit-request"
                                type="button"
                                onClick={() => {
                                  setEditingRequestId(transaction.id);
                                  setAmount(String(transaction.amount));
                                  setPaymentMethod(details?.paymentMethod || "");
                                  setMobileNumber(
                                    details?.mobileNumber === "Not required"
                                      ? ""
                                      : details?.mobileNumber || ""
                                  );
                                  setWhatsappNumber(
                                    details?.whatsappNumber || ""
                                  );
                                  setRequestError("");
                                  setTopUpOpen(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="wallet-cancel-request"
                                type="button"
                                disabled={
                                  cancellingRequestId === transaction.id
                                }
                                onClick={() => cancelTopUpRequest(transaction)}
                              >
                                {cancellingRequestId === transaction.id
                                  ? "Cancelling..."
                                  : "Cancel"}
                              </button>
                            </div>
                          )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {error && (
            <div className="wallet-message error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={refreshWallet} disabled={loading}>
                Try again
              </button>
            </div>
          )}

          {topUpOpen && (
            <div
              className="wallet-modal-overlay"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setTopUpOpen(false);
                  setPaymentDropdownOpen(false);
                }
              }}
            >
              <section
                className="wallet-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="wallet-top-up-title"
              >
                <button
                  className="wallet-modal-close"
                  type="button"
                  onClick={() => {
                    setTopUpOpen(false);
                    setPaymentDropdownOpen(false);
                  }}
                  aria-label="Close add funds dialog"
                >
                  ×
                </button>
                <div className="wallet-funding-title">
                  <span className="wallet-funding-icon">
                    <FontAwesomeIcon icon={faArrowDown} />
                  </span>
                  <div className="wallet-funding-copy">
                    <h2 id="wallet-top-up-title">
                      {editingRequestId ? "Edit top-up request" : "Request a top-up"}
                    </h2>
                    <p>
                      {editingRequestId
                        ? "You can edit this request while it is pending. The admin will be notified of your changes."
                        : "The admin reviews your request before adding funds."}
                    </p>
                  </div>
                </div>

                <form className="wallet-top-up-form" onSubmit={submitTopUpRequest}>
                  <label className="wallet-field">
                    <span>Amount (EGP)</span>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="Enter amount"
                      required
                    />
                  </label>

                  <label className="wallet-field">
                    <span>Payment method</span>
                    <div
                      className="wallet-payment-dropdown"
                      ref={paymentDropdownRef}
                    >
                      <button
                        type="button"
                        className="wallet-payment-trigger"
                        aria-haspopup="listbox"
                        aria-expanded={paymentDropdownOpen}
                        aria-controls="wallet-payment-options"
                        disabled={
                          paymentMethodsLoading || paymentMethods.length === 0
                        }
                        onClick={() =>
                          setPaymentDropdownOpen((isOpen) => !isOpen)
                        }
                      >
                        {selectedPaymentMethod?.logo ? (
                          <img
                            className="wallet-payment-logo"
                            src={selectedPaymentMethod.logo}
                            alt=""
                          />
                        ) : (
                          <span className="wallet-payment-logo-fallback">
                            {selectedPaymentMethod?.name?.charAt(0) || "?"}
                          </span>
                        )}
                        <span className="wallet-payment-trigger-copy">
                          <strong>
                            {paymentMethodsLoading
                              ? "Loading payment methods..."
                              : selectedPaymentMethod?.name ||
                                "Select a payment method"}
                          </strong>
                          <small>
                            {selectedPaymentMethod
                              ? selectedPaymentMethod["mobile-number"]
                                ? "Payment mobile number required"
                                : "No payment mobile number needed"
                              : "Choose how you want to pay"}
                          </small>
                        </span>
                        <span
                          className={`wallet-payment-chevron ${
                            paymentDropdownOpen ? "open" : ""
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                      {paymentDropdownOpen && (
                        <div
                          className="wallet-payment-options"
                          id="wallet-payment-options"
                          role="listbox"
                          aria-label="Available payment methods"
                        >
                          {paymentMethods.map((method) => (
                            <button
                              type="button"
                              className={`wallet-payment-option ${
                                method.name === paymentMethod ? "selected" : ""
                              }`}
                              key={method.name}
                              role="option"
                              aria-selected={method.name === paymentMethod}
                              onClick={() => {
                                setPaymentMethod(method.name);
                                setMobileNumber("");
                                setRequestError("");
                                setPaymentDropdownOpen(false);
                              }}
                              onKeyDown={(event) => {
                                const options = [
                                  ...paymentDropdownRef.current.querySelectorAll(
                                    '[role="option"]'
                                  ),
                                ];
                                const optionIndex = options.indexOf(
                                  event.currentTarget
                                );
                                let nextIndex;

                                if (event.key === "ArrowDown") {
                                  nextIndex = (optionIndex + 1) % options.length;
                                } else if (event.key === "ArrowUp") {
                                  nextIndex =
                                    (optionIndex - 1 + options.length) %
                                    options.length;
                                } else if (event.key === "Home") {
                                  nextIndex = 0;
                                } else if (event.key === "End") {
                                  nextIndex = options.length - 1;
                                } else if (event.key === "Escape") {
                                  setPaymentDropdownOpen(false);
                                  paymentDropdownRef.current
                                    .querySelector(".wallet-payment-trigger")
                                    .focus();
                                  return;
                                } else {
                                  return;
                                }

                                event.preventDefault();
                                options[nextIndex]?.focus();
                              }}
                            >
                              {method.logo ? (
                                <img
                                  className="wallet-payment-logo"
                                  src={method.logo}
                                  alt=""
                                />
                              ) : (
                                <span className="wallet-payment-logo-fallback">
                                  {method.name.charAt(0)}
                                </span>
                              )}
                              <span className="wallet-payment-option-copy">
                                <strong>{method.name}</strong>
                                <small>
                                  {method["mobile-number"]
                                    ? "Mobile number required"
                                    : "No mobile number required"}
                                </small>
                              </span>
                              {method.name === paymentMethod && (
                                <span
                                  className="wallet-payment-selected-mark"
                                  aria-hidden="true"
                                >
                                  ✓
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>

                  {selectedPaymentMethod?.["mobile-number"] && (
                    <label className="wallet-field">
                      <span>Mobile number used for payment</span>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={mobileNumber}
                        onChange={(event) => setMobileNumber(event.target.value)}
                        placeholder="Enter your mobile number"
                        required
                      />
                    </label>
                  )}

                  <label className="wallet-field">
                    <span>WhatsApp contact number</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={whatsappNumber}
                      onChange={(event) =>
                        setWhatsappNumber(event.target.value)
                      }
                      placeholder="Enter a number we can reach you on"
                      required
                    />
                  </label>

                  {paymentMethodsError && (
                    <p className="wallet-form-message error" role="alert">
                      {paymentMethodsError}
                    </p>
                  )}
                  {requestError && (
                    <p className="wallet-form-message error" role="alert">
                      {requestError}
                    </p>
                  )}
                  <button
                    className="wallet-submit"
                    type="submit"
                    disabled={
                      requestLoading ||
                      paymentMethodsLoading ||
                      paymentMethods.length === 0
                    }
                  >
                    {requestLoading
                      ? editingRequestId
                        ? "Saving changes..."
                        : "Sending request..."
                      : editingRequestId
                        ? "Save changes"
                        : "Send top-up request"}
                  </button>
                </form>
              </section>
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
      {toastMessage && (
        <div
          className={`wallet-toast ${toastWarning ? "warning" : ""}`}
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
    </section>
  );
}

export default Wallet;
