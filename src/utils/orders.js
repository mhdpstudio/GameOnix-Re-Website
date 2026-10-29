// Helpers for reading game purchase requests out of the wallet ledger.
// Orders are stored as "purchase_request" transactions whose description is a
// JSON string with the game, pack and delivery details.

export const WALLET_API_URL =
  "https://gameonixfav.vercel.app/api/auth/wallet";

export const PURCHASE_TRANSACTION_TYPE = "purchase_request";

const SUCCESS_STATUSES = new Set(["approved", "completed", "success"]);
const DECLINED_STATUSES = new Set(["rejected"]);
const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);

const AMOUNT_FORMATTER = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-EG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-EG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function parseOrderDetails(description) {
  if (typeof description !== "string") return {};

  const trimmed = description.trim();

  if (!trimmed.startsWith("{")) return {};

  try {
    const parsed = JSON.parse(trimmed);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function getOrderStatus(rawStatus) {
  const status = String(rawStatus || "").trim().toLowerCase();

  if (!status) return { key: "unknown", label: "Unknown" };
  if (SUCCESS_STATUSES.has(status)) {
    return {
      key: "completed",
      label: status === "approved" ? "Approved" : "Completed",
    };
  }
  if (DECLINED_STATUSES.has(status)) {
    return { key: "declined", label: "Declined" };
  }
  if (CANCELLED_STATUSES.has(status)) {
    return { key: "cancelled", label: "Cancelled" };
  }
  if (status === "pending") {
    return { key: "pending", label: "Awaiting approval" };
  }

  return {
    key: "unknown",
    label: status.charAt(0).toUpperCase() + status.slice(1),
  };
}

export function formatOrderAmount(value) {
  const amount = Number(value);

  return AMOUNT_FORMATTER.format(Number.isFinite(amount) ? amount : 0);
}

export function formatOrderDate(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return DATE_FORMATTER.format(date);
}

export function formatOrderDateTime(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return DATE_TIME_FORMATTER.format(date);
}

export function toOrder(transaction) {
  const details = parseOrderDetails(transaction?.description);
  const status = getOrderStatus(transaction?.status);
  const codes = Array.isArray(details.giftCardCodes)
    ? details.giftCardCodes
        .filter((code) => typeof code === "string" && code.trim())
        .map((code) => code.trim())
    : [];

  return {
    id: String(transaction?.id || ""),
    amount: Number(transaction?.amount) || 0,
    createdAt: String(transaction?.createdAt || ""),
    statusKey: status.key,
    statusLabel: status.label,
    gameName: String(details.gameName || "Game purchase"),
    gameIcon: String(details.gameIcon || ""),
    packageName: String(details.packageName || details.packageTitle || ""),
    quantity: Number(details.quantity) || 1,
    playerId: String(details.playerId || ""),
    serverId: String(details.serverId || ""),
    recipient: String(details.recipient || ""),
    isGift: details.isGift === true,
    isGiftCard: details.isGiftCard === true,
    paymentMethod: String(details.paymentMethod || ""),
    walletPayment: details.walletPayment === true,
    contactEmail: String(details.contactEmail || ""),
    giftCardCodes: codes,
  };
}

export function getOrderDestination(order) {
  if (!order) return { label: "Player ID", value: "" };

  if (order.isGift) {
    return { label: "Gift recipient", value: order.recipient };
  }

  return { label: "Player ID", value: order.playerId };
}

export function getOrderFilters(orders) {
  const counts = orders.reduce(
    (totals, order) => {
      totals[order.statusKey] = (totals[order.statusKey] || 0) + 1;
      return totals;
    },
    {}
  );

  const filters = [
    { key: "all", label: "All", count: orders.length },
    {
      key: "pending",
      label: "Awaiting approval",
      count: counts.pending || 0,
    },
    { key: "completed", label: "Completed", count: counts.completed || 0 },
    { key: "declined", label: "Declined", count: counts.declined || 0 },
  ];

  if (counts.cancelled) {
    filters.push({
      key: "cancelled",
      label: "Cancelled",
      count: counts.cancelled,
    });
  }

  return filters;
}
