import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  faBolt,
  faFire,
  faMagnifyingGlass,
  faArrowRight,
  faXmark,
  faGamepad,
  faCreditCard,
  faTags,
  faLayerGroup,
  faRotate,
  faLock,
  faGift,
  faCheck,
  faWallet,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth } from "../context/AuthContext";
import "./../style/game-cards.css";

const DATA_URL =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/recharge.json";

const RAW_ASSET_BASE =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-Content/main/";

const DEFAULT_AVATAR =
  "https://raw.githubusercontent.com/mhdpstudio/GameOnix-Data-All/main/0.png";

const PAYMENT_METHODS = [
  { id: "vodafone", name: "Vodafone Cash", short: "VF", color: "#f32632" },
  { id: "efinance", name: "e& money", short: "e&", color: "#ed2028" },
  { id: "orange", name: "Orange Cash", short: "OR", color: "#ff7900" },
  { id: "instapay", name: "InstaPay", short: "IP", color: "#b65af0" },
  { id: "card", name: "Visa / MasterCard", short: "VISA", color: "#4e91ff" },
  { id: "wallets", name: "Mobile Wallets", short: "MW", color: "#a855f7" },
  { id: "opay", name: "Pay with OPay", short: "OP", color: "#22cdb4" },
  { id: "fawry", name: "Fawry", short: "FW", color: "#f6b900", disabled: true },
  { id: "aman", name: "Aman / Masary", short: "AM", color: "#12c8b2" },
];

function getImageUrl(path) {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const cleanPath = String(path)
    .replace(/^(\.\.\/)+/, "")
    .replace(/^\/+/, "");

  return RAW_ASSET_BASE + cleanPath;
}

function getGameIconUrl(product) {
  const imageUrl = getImageUrl(product?.image);

  if (!imageUrl) return "";

  // إزالة اسم الملف والامتداد، ثم إضافة -icon.webp
  return imageUrl.replace(/[^/]+$/, (filename) =>
    filename.replace(/\.[^.]+$/, "").replace(/-icon$/, "") + "-icon.webp"
  );
}

function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  return `EGP ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ProductImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className={`gc-image-wrap ${className}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt || ""}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="gc-image-fallback">
          <FontAwesomeIcon icon={faGamepad} />
        </div>
      )}
    </div>
  );
}

// أيقونة اللعبة داخل البوب أب فقط.
// أيقونة اللعبة داخل البوب أب فقط، باستخدام رابط -icon.webp
function PopupGameIcon({ product, className = "" }) {
  const [failed, setFailed] = useState(false);

  const src = getImageUrl(product?.image).replace(/\.webp(\?.*)?$/i, "-icon.webp$1");

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`gc-game-icon-fallback ${className}`}
        aria-hidden="true"
      >
        <FontAwesomeIcon icon={faGamepad} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={product?.name || ""}
      className={`gc-game-icon ${className}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function CheckoutUserAvatar({ user }) {
  const [failedSrc, setFailedSrc] = useState("");
  const avatar = user?.avatar || DEFAULT_AVATAR;
  const src = failedSrc === avatar ? DEFAULT_AVATAR : avatar;

  return (
    <img
      className="gc-contact-avatar"
      src={src}
      alt=""
      onError={() => setFailedSrc(avatar)}
    />
  );
}

function GameCards() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPack, setSelectedPack] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState("vodafone");
  const [popularOnly, setPopularOnly] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [playerId, setPlayerId] = useState("");
  const [serverId, setServerId] = useState("");
  const [email, setEmail] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");

  async function loadCatalog() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(DATA_URL, { cache: "no-cache" });

      if (!response.ok) {
        throw new Error(`Catalog request failed (${response.status})`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Unexpected catalog format.");
      }

      setCatalog(data);
    } catch (err) {
      console.error("GameOnix catalog error:", err);
      setError("تعذر تحميل المنتجات. اتأكد من الاتصال بالإنترنت وحاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  const categories = useMemo(() => {
    const types = [...new Set(catalog.map((item) => item.type).filter(Boolean))];

    return [
      { id: "All", label: "All Products", icon: faLayerGroup },
      ...types.map((type) => ({
        id: type,
        label: type,
        icon: type === "Gift Cards" ? faCreditCard : faGamepad,
      })),
    ];
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    let products = [...catalog];

    if (activeCategory !== "All") {
      products = products.filter((item) => item.type === activeCategory);
    }

    const query = search.trim().toLowerCase();

    if (query) {
      products = products.filter((item) => {
        const name = String(item.name || "").toLowerCase();
        const id = String(item.id || "").toLowerCase();

        const packs = (item.packs || [])
          .map((pack) => `${pack.title || ""} ${pack.type || ""}`)
          .join(" ")
          .toLowerCase();

        return (
          name.includes(query) ||
          id.includes(query) ||
          packs.includes(query)
        );
      });
    }

    if (popularOnly) {
      products = products.filter((item) =>
        (item.packs || []).some((pack) => pack.popular)
      );
    }

    if (sortBy === "name") {
      products.sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
    }

    return products;
  }, [catalog, activeCategory, search, popularOnly, sortBy]);

  const totalPacks = catalog.reduce(
    (total, product) => total + (product.packs?.length || 0),
    0
  );

  function openProduct(product) {
    setSelectedProduct(product);
    setSelectedPack(null);
    setQuantity(1);
    setSelectedPayment("vodafone");
    setPlayerId("");
    setServerId("");
    setEmail(user?.email || "");
    setRecipient("");
    setIsGift(false);
    setCheckoutMessage("");
  }

  function closeProduct() {
    setSelectedProduct(null);
    setSelectedPack(null);
    setCheckoutMessage("");
  }

  useEffect(() => {
    if (!selectedProduct) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") closeProduct();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedProduct]);

  const subtotal = selectedPack
    ? Number(selectedPack.price) * quantity
    : 0;

  const total = subtotal;

  function choosePack(pack) {
    setSelectedPack(pack);
    setQuantity(1);
    setCheckoutMessage("");
  }

  function handleCheckout(event) {
    event.preventDefault();
    setCheckoutMessage("");

    if (authLoading || !user) {
      setCheckoutMessage("Sign in before continuing with your order.");
      return;
    }

    if (!selectedPack) {
      setCheckoutMessage("اختار الباقة الأول.");
      return;
    }

    if (isGift && !recipient.trim()) {
      setCheckoutMessage("اكتب بيانات المستلم عشان تكمل.");
      return;
    }

    if (!isGift && !playerId.trim()) {
      setCheckoutMessage("اكتب Player ID عشان تكمل.");
      return;
    }

    if (!selectedPayment) {
      setCheckoutMessage("اختار وسيلة الدفع.");
      return;
    }

    setCheckoutMessage(
      "تم التحقق من البيانات على الواجهة فقط. إتمام الطلب يحتاج Backend وبوابة دفع متصلة."
    );
  }

  return (
    <main className="game-cards-page">
      <div className="gc-container">
        <header className="gc-topbar">
          <div className="gc-breadcrumb">
            <span>GameOnix</span>
            <FontAwesomeIcon icon={faArrowRight} />
            <span className="current">Shopping</span>
          </div>

          <div className="gc-live-status">
            <span className="gc-status-dot" />
            Digital Store
          </div>
        </header>

        <section className="gc-hero">
          <div className="gc-hero-content">
            <span className="gc-eyebrow">
              <FontAwesomeIcon icon={faBolt} />
              GAMEONIX SHOP
            </span>

            <h1>
              Power up your
              <br />
              <span>next adventure.</span>
            </h1>

            <p>
              Choose your game, select the pack you need, and review your order
              in one place.
            </p>

            <button
              type="button"
              className="gc-hero-button"
              onClick={() =>
                document.getElementById("gc-store")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            >
              Explore store <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>

          <div className="gc-hero-art" aria-hidden="true">
            <div className="gc-art-orbit gc-art-orbit-one" />
            <div className="gc-art-orbit gc-art-orbit-two" />

            <div className="gc-art-card gc-art-card-back">
              <FontAwesomeIcon icon={faCreditCard} />
            </div>

            <div className="gc-art-card gc-art-card-front">
              <span>GAME</span>
              <strong>ONIX</strong>
              <FontAwesomeIcon icon={faGamepad} />
              <small>DIGITAL GOODS</small>
            </div>

            <div className="gc-art-spark gc-art-spark-one">✦</div>
            <div className="gc-art-spark gc-art-spark-two">✧</div>
          </div>
        </section>

        <section className="gc-stats">
          <div className="gc-stat">
            <span className="gc-stat-icon">
              <FontAwesomeIcon icon={faGamepad} />
            </span>
            <div>
              <strong>{loading ? "—" : catalog.length}</strong>
              <span>Products</span>
            </div>
          </div>

          <div className="gc-stat">
            <span className="gc-stat-icon">
              <FontAwesomeIcon icon={faTags} />
            </span>
            <div>
              <strong>{loading ? "—" : totalPacks}</strong>
              <span>Available packs</span>
            </div>
          </div>

          <div className="gc-stat">
            <span className="gc-stat-icon">
              <FontAwesomeIcon icon={faFire} />
            </span>
            <div>
              <strong>
                {loading
                  ? "—"
                  : catalog.filter((item) =>
                    (item.packs || []).some((pack) => pack.popular)
                  ).length}
              </strong>
              <span>Popular picks</span>
            </div>
          </div>
        </section>

        <section className="gc-store" id="gc-store">
          <div className="gc-section-heading">
            <div>
              <span className="gc-section-kicker">FIND YOUR NEXT PICK</span>
              <h2>Explore the store</h2>
              <p>Choose a product to open its pack selector and order popup.</p>
            </div>

            <button
              type="button"
              className="gc-refresh-button"
              onClick={loadCatalog}
              disabled={loading}
              aria-label="Refresh catalog"
              title="Refresh catalog"
            >
              <FontAwesomeIcon
                icon={faRotate}
                className={loading ? "gc-spinning" : ""}
              />
            </button>
          </div>

          <div className="gc-toolbar">
            <label className="gc-search">
              <FontAwesomeIcon icon={faMagnifyingGlass} />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search games, cards or packs..."
                aria-label="Search products"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </label>

            <label className="gc-sort">
              <span>Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="name">Name: A–Z</option>
              </select>
            </label>
          </div>

          <div className="gc-category-tabs">
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={
                  activeCategory === category.id
                    ? "gc-category-tab active"
                    : "gc-category-tab"
                }
                onClick={() => setActiveCategory(category.id)}
              >
                <FontAwesomeIcon icon={category.icon} />
                {category.label}
              </button>
            ))}
          </div>

          <div className="gc-filter-row">
            <span className="gc-result-count">
              {loading
                ? "Loading products..."
                : `${filteredCatalog.length} results`}
            </span>

            <button
              type="button"
              className={`gc-popular-filter${popularOnly ? " active" : ""}`}
              onClick={() => setPopularOnly((value) => !value)}
              aria-pressed={popularOnly}
            >
              <FontAwesomeIcon icon={faFire} /> Popular packs
            </button>
          </div>

          {loading ? (
            <div className="gc-product-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="gc-skeleton" key={index}>
                  <div className="gc-skeleton-image" />
                  <div className="gc-skeleton-line" />
                  <div className="gc-skeleton-line short" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="gc-state-card">
              <div className="gc-state-icon">
                <FontAwesomeIcon icon={faRotate} />
              </div>
              <h3>Store unavailable</h3>
              <p>{error}</p>
              <button
                type="button"
                className="gc-hero-button"
                onClick={loadCatalog}
              >
                Try again <FontAwesomeIcon icon={faRotate} />
              </button>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="gc-state-card">
              <div className="gc-state-icon">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </div>
              <h3>No products found</h3>
              <p>Try another search or category.</p>

              <button
                type="button"
                className="gc-reset-button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All");
                  setPopularOnly(false);
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="gc-product-grid">
              {filteredCatalog.map((product) => {
                const packs = product.packs || [];
                const popular = packs.some((pack) => pack.popular);

                return (
                  <article className="gc-product-card" key={product.id}>
                    <button
                      type="button"
                      className="gc-product-click"
                      onClick={() => openProduct(product)}
                      aria-label={`Choose ${product.name}`}
                    >
                      <div className="gc-product-image">
                        <ProductImage
                          src={getImageUrl(product.image)}
                          alt={product.name}
                        />

                        <span
                          className={`gc-product-type ${product.type === "Gift Cards" ? "gift" : "recharge"
                            }`}
                        >
                          {product.type === "Gift Cards" ? "GIFT CARD" : "TOP-UP"}
                        </span>

                        {popular && (
                          <span className="gc-popular-badge">
                            <FontAwesomeIcon icon={faFire} /> Popular
                          </span>
                        )}

                        <span className="gc-product-open">
                          <FontAwesomeIcon icon={faArrowRight} />
                        </span>
                      </div>

                      <div className="gc-product-info">
                        <span className="gc-pack-count">
                          {packs.length} available packs
                        </span>

                        <div className="gc-product-title">
                          <h3>{product.name}</h3>
                        </div>

                        <div className="gc-product-footer">
                          <span className="gc-view-link">
                            Choose pack <FontAwesomeIcon icon={faArrowRight} />
                          </span>
                        </div>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="gc-footer">
          <span className="gc-footer-mark">
            <FontAwesomeIcon icon={faGamepad} />
          </span>
          <p>
            <strong>GameOnix</strong>
            <span>Your next adventure starts here.</span>
          </p>
        </footer>
      </div>

      {selectedProduct && (
        <div
          className="gc-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProduct();
          }}
        >
          <section
            className={`gc-checkout-modal${user ? "" : " gc-auth-required-modal"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gc-modal-title"
          >
            <header className="gc-checkout-header">
              <div className="gc-currency">
                <span className="gc-egypt-flag">🇪🇬</span>
                <strong>EGP</strong>
                <span className="gc-currency-chevron">⌄</span>
              </div>

              <h2>Checkout</h2>

              <button
                type="button"
                className="gc-modal-close"
                onClick={closeProduct}
                aria-label="Close checkout"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>

            {authLoading ? (
              <div className="gc-auth-gate" role="status">
                <div className="gc-auth-gate-spinner" />
                <h3 id="gc-modal-title">Checking your account...</h3>
              </div>
            ) : !user ? (
              <div className="gc-auth-gate">
                <ProductImage
                  src={getImageUrl(selectedProduct.image)}
                  alt={selectedProduct.name}
                  className="gc-auth-product-image"
                />
                <span className="gc-auth-gate-kicker">ONE MORE STEP</span>
                <h3 id="gc-modal-title">Sign in before you buy</h3>
                <p>
                  Sign in to choose a pack for {selectedProduct.name} and
                  continue with your purchase.
                </p>
                <button
                  type="button"
                  className="gc-login-required-button"
                  onClick={() =>
                    navigate("/login", {
                      state: { from: "/shopping/game-cards" },
                    })
                  }
                >
                  Sign in to continue
                  <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </div>
            ) : (
            <form className="gc-checkout-body" onSubmit={handleCheckout}>
              <div className="gc-checkout-left">
                <div className="gc-contact-card">
                  <CheckoutUserAvatar user={user} />

                  <div className="gc-contact-copy">
                    <strong>{user.name || user.username}</strong>
                    <span>{user.email || `@${user.username}`}</span>
                  </div>
                </div>

                <section className="gc-order-section">
                  <div className="gc-checkout-label">ORDER SUMMARY</div>

                  <div className="gc-order-card">
                    <div className="gc-order-product">
                      <PopupGameIcon
                        product={selectedProduct}
                        className="gc-order-image"
                      />

                      <div className="gc-order-details">
                        <strong id="gc-modal-title">
                          {selectedProduct.name}
                        </strong>

                        <span>
                          {selectedPack
                            ? `${selectedPack.title} ${selectedPack.type || ""}`
                            : "Select a pack below"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="gc-remove-pack"
                        onClick={() => setSelectedPack(null)}
                        disabled={!selectedPack}
                        aria-label="Remove selected pack"
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>

                    {selectedPack && (
                      <div className="gc-quantity-row">
                        <span>Quantity</span>

                        <div className="gc-quantity-control">
                          <button
                            type="button"
                            onClick={() =>
                              setQuantity((q) => Math.max(1, q - 1))
                            }
                            disabled={quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>

                          <strong>{quantity}</strong>

                          <button
                            type="button"
                            onClick={() =>
                              setQuantity((q) => Math.min(99, q + 1))
                            }
                            disabled={quantity >= 99}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <strong className="gc-order-price">
                          {formatPrice(selectedPack.price * quantity)}
                        </strong>
                      </div>
                    )}

                    <div className="gc-price-lines">
                      <div>
                        <span>Subtotal</span>
                        <strong>{formatPrice(subtotal)}</strong>
                      </div>

                      <div>
                        <span>Fees</span>
                        <strong>Calculated at payment</strong>
                      </div>
                    </div>
                  </div>
                </section>

                <label className="gc-gift-toggle">
                  <span className="gc-gift-icon">
                    <FontAwesomeIcon icon={faGift} />
                  </span>

                  <span className="gc-gift-copy">
                    <strong>Send as a gift</strong>
                    <small>Enter the recipient's details</small>
                  </span>

                  <input
                    type="checkbox"
                    checked={isGift}
                    onChange={(event) => {
                      setIsGift(event.target.checked);
                      setCheckoutMessage("");
                    }}
                  />

                  <span className="gc-switch" />
                </label>

                <div className="gc-fields-card">
                  <div className="gc-fields-heading">
                    <span>ACCOUNT INFORMATION</span>
                    <small>Required to process an order</small>
                  </div>

                  {isGift ? (
                    <>
                      <label className="gc-field">
                        <span>Recipient Player ID / Account</span>
                        <input
                          value={recipient}
                          onChange={(event) => setRecipient(event.target.value)}
                          placeholder="Enter recipient details"
                        />
                      </label>

                      <label className="gc-field">
                        <span>Your email (optional)</span>
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="gc-field">
                        <span>Player ID / Account ID</span>
                        <input
                          value={playerId}
                          onChange={(event) => setPlayerId(event.target.value)}
                          placeholder="Enter your Player ID"
                        />
                      </label>

                      <label className="gc-field">
                        <span>Server / Region (if required)</span>
                        <input
                          value={serverId}
                          onChange={(event) => setServerId(event.target.value)}
                          placeholder="Enter server or region"
                        />
                      </label>

                      <label className="gc-field">
                        <span>Email (optional)</span>
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="gc-checkout-right">
                <section className="gc-pack-selector">
                  <div className="gc-checkout-label">
                    SELECT YOUR PACK
                    <span>{(selectedProduct.packs || []).length} options</span>
                  </div>

                  <div className="gc-modal-product-heading">
                    <PopupGameIcon
                      product={selectedProduct}
                      className="gc-modal-product-image"
                    />

                    <div className="gc-modal-product-heading-copy">
                      <h3>{selectedProduct.name}</h3>
                      <p>Choose the exact amount you want to purchase.</p>
                    </div>
                  </div>

                  <div className="gc-pack-grid">
                    {(selectedProduct.packs || []).map((pack, index) => {
                      const isSelected =
                        selectedPack === pack ||
                        (selectedPack &&
                          selectedPack.title === pack.title &&
                          selectedPack.type === pack.type &&
                          selectedPack.price === pack.price);

                      return (
                        <button
                          type="button"
                          key={`${selectedProduct.id}-${pack.title}-${index}`}
                          className={`gc-pack-card${isSelected ? " selected" : ""
                            }`}
                          onClick={() => choosePack(pack)}
                        >
                          {pack.popular && (
                            <span className="gc-pack-popular">
                              <FontAwesomeIcon icon={faFire} /> Popular
                            </span>
                          )}

                          <ProductImage
                            src={getGameIconUrl(selectedProduct)}
                            alt={selectedProduct.name}
                            className="gc-pack-image"
                          />

                          <strong className="gc-pack-title">
                            {pack.title} {pack.type || ""}
                          </strong>

                          <span className="gc-pack-price">
                            {formatPrice(pack.price)}
                          </span>

                          {pack.oldPrice && (
                            <span className="gc-old-price">
                              {formatPrice(pack.oldPrice)}
                            </span>
                          )}

                          <span className="gc-pack-check">
                            <FontAwesomeIcon icon={faCheck} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="gc-payment-section">
                  <div className="gc-checkout-label">
                    SELECT PAYMENT METHOD
                  </div>

                  <div className="gc-payment-grid">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        type="button"
                        key={method.id}
                        disabled={method.disabled}
                        onClick={() => {
                          setSelectedPayment(method.id);
                          setCheckoutMessage("");
                        }}
                        className={[
                          "gc-payment-method",
                          selectedPayment === method.id ? "selected" : "",
                          method.disabled ? "disabled" : "",
                        ].join(" ")}
                        style={{ "--payment-color": method.color }}
                      >
                        <span className="gc-payment-instant">
                          <FontAwesomeIcon icon={faBolt} />{" "}
                          {method.disabled ? "UNAVAILABLE" : "PAYMENT"}
                        </span>

                        <span className={`gc-payment-logo gc-logo-${method.id}`}>
                          {method.id === "card" ? (
                            <span className="gc-card-brands">
                              <b>VISA</b>
                              <b>●●</b>
                            </span>
                          ) : method.id === "wallets" ? (
                            <FontAwesomeIcon icon={faWallet} />
                          ) : (
                            method.short
                          )}
                        </span>

                        <strong>{method.name}</strong>

                        {selectedPayment === method.id && (
                          <span className="gc-payment-check">
                            <FontAwesomeIcon icon={faCheck} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="gc-security-row">
                    <span>
                      <FontAwesomeIcon icon={faLock} /> Secure checkout
                    </span>
                    <span>
                      <FontAwesomeIcon icon={faBolt} /> Digital product
                    </span>
                    <span>
                      <FontAwesomeIcon icon={faShieldHalved} /> Order details
                    </span>
                  </div>
                </section>

                {checkoutMessage && (
                  <div className="gc-checkout-message" role="status">
                    {checkoutMessage}
                  </div>
                )}

                <div className="gc-payment-footer">
                  <div className="gc-total-row">
                    <span>TOTAL</span>
                    <strong>{formatPrice(total)}</strong>
                  </div>

                  <button
                    type="submit"
                    className="gc-pay-button"
                    disabled={!selectedPack}
                  >
                    <FontAwesomeIcon icon={faLock} />
                    Continue · {formatPrice(total)}
                  </button>

                  <p className="gc-terms">
                    Continuing does not charge you. Payment processing must be
                    connected before orders can be completed.
                  </p>
                </div>
              </div>
            </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default GameCards;