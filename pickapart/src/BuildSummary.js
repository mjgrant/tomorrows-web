import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function BuildSummary({ user, currency }) {
  const navigate = useNavigate();
  const [currentBuild, setCurrentBuild] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeCategoryModal, setActiveCategoryModal] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const MULTI_PART_KEYS = ["memory", "storage", "video-card", "peripherals"];

  const partTypes = [
    { key: "cpu", name: "CPU" },
    { key: "cpu-cooler", name: "CPU Cooler" },
    { key: "motherboard", name: "Motherboard" },
    { key: "memory", name: "Memory" },
    { key: "storage", name: "Storage" },
    { key: "video-card", name: "Video Card" },
    { key: "case", name: "Case" },
    { key: "power-supply", name: "Power Supply" },
    { key: "operating-system", name: "Operating System" },
    { key: "peripherals", name: "Peripherals" },
    { key: "expansion-card", name: "Expansion Cards" },
    { key: "accessories", name: "Accessories / Other" }
  ];

  const isMultiCategory = (key) => MULTI_PART_KEYS.includes(key);

  const parsePriceNumber = (price) => {
    if (!price) return 0;
    const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const formatMoney = (usdAmount) => {
    const rate = currency?.rate || 1;
    const symbol = currency?.symbol || "$";
    const converted = usdAmount * rate;
    return `${symbol} ${converted.toFixed(2)}`;
  };

  useEffect(() => {
    try {
      localStorage.removeItem("currentBuild");
    } catch (_) {}

    const savedBuild = JSON.parse(
      sessionStorage.getItem("currentBuild") || "{}"
    );
    setCurrentBuild(savedBuild);
  }, []);

  useEffect(() => {
    if (!user) return;

    const syncBuilds = async () => {
      const localBuild =
        JSON.parse(sessionStorage.getItem("currentBuild") || "{}") || {};

      try {
        const res = await fetch("http://localhost:5000/api/build/current", {
          credentials: "include"
        });

        if (!res.ok) {
          if (Object.keys(localBuild).length > 0) {
            try {
              await fetch("http://localhost:5000/api/build/current", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ currentBuild: localBuild })
              });
            } catch (e) {
              console.error("Error pushing local build to server:", e);
            }
          }
          setCurrentBuild(localBuild);
          return;
        }

        const data = await res.json();
        const serverBuild = data.currentBuild || {};
        const localCount = Object.keys(localBuild).length;
        const serverCount = Object.keys(serverBuild).length;

        if (serverCount === 0 && localCount > 0) {
          setCurrentBuild(localBuild);
          sessionStorage.setItem("currentBuild", JSON.stringify(localBuild));
          try {
            await fetch("http://localhost:5000/api/build/current", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ currentBuild: localBuild })
            });
          } catch (e) {
            console.error("Error syncing local build up to server:", e);
          }
          return;
        }

        if (serverCount >= localCount) {
          setCurrentBuild(serverBuild);
          sessionStorage.setItem("currentBuild", JSON.stringify(serverBuild));
        } else {
          setCurrentBuild(localBuild);
          sessionStorage.setItem("currentBuild", JSON.stringify(localBuild));
          try {
            await fetch("http://localhost:5000/api/build/current", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ currentBuild: localBuild })
            });
          } catch (e) {
            console.error("Error overriding server build with local:", e);
          }
        }
      } catch (err) {
        console.error("Error syncing builds:", err);
        setCurrentBuild(localBuild);
      }
    };

    syncBuilds();
  }, [user]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setShowSuccessPopup(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const persistBuild = async (newBuild) => {
    sessionStorage.setItem("currentBuild", JSON.stringify(newBuild));
    setCurrentBuild(newBuild);

    if (user) {
      try {
        await fetch("http://localhost:5000/api/build/current", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ currentBuild: newBuild })
        });
      } catch (err) {
        console.error("Error updating current build on backend:", err);
      }
    }
  };

  const removePartCategory = async (partKey) => {
    const newBuild = { ...currentBuild };
    delete newBuild[partKey];
    await persistBuild(newBuild);
  };

  const handleClearAll = async () => {
    const empty = {};
    await persistBuild(empty);
  };

  const calculateTotalUsd = () => {
    let total = 0;

    for (const key of Object.keys(currentBuild || {})) {
      const value = currentBuild[key];

      if (isMultiCategory(key)) {
        let items = [];
        if (Array.isArray(value)) items = value;
        else if (value) items = [value];

        items.forEach((part) => {
          const qty = part.quantity || 1;
          total += parsePriceNumber(part.price) * qty;
        });
      } else {
        if (value) {
          total += parsePriceNumber(value.price || value.totalPrice);
        }
      }
    }

    return total;
  };

  const totalUsd = calculateTotalUsd();
  const totalDisplay = formatMoney(totalUsd);

  const isEmpty = Object.keys(currentBuild).every((key) => {
    const v = currentBuild[key];
    if (isMultiCategory(key)) {
      if (Array.isArray(v)) return v.length === 0;
      if (v && typeof v === "object") return false;
      return true;
    }
    return !v;
  });

  const handleCheckout = () => {
    if (!user || isEmpty) return;
    setShowSuccessPopup(true);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveBuild = async () => {
    if (!user || isEmpty) {
      showToast("error", "You need a signed-in account and at least one part.");
      return;
    }

    const defaultName = "My Build";
    const name = window.prompt("Give this build a name:", defaultName);
    if (!name) return;

    setSaving(true);
    try {
      const res = await fetch("http://localhost:5000/api/build/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          currentBuild,
          totalPrice: totalUsd
        })
      });

      if (res.ok) {
        showToast("success", "Build saved to your profile.");
      } else {
        showToast("error", "Failed to save build. Please try again.");
      }
    } catch (err) {
      console.error("Error saving build:", err);
      showToast("error", "Failed to save build. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePartClick = (partKey) => {
    navigate(`/parts/${partKey}`);
  };

  const openCategoryModal = (key) => {
    setActiveCategoryModal(key);
  };

  const closeCategoryModal = () => {
    setActiveCategoryModal(null);
  };

  const getCategoryItems = (key) => {
    const raw = currentBuild[key];
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return [raw];
  };

  const updateCategoryItems = async (key, items) => {
    const newBuild = { ...currentBuild };
    newBuild[key] = items;
    await persistBuild(newBuild);
  };

  const removeItemFromCategory = async (key, itemId) => {
    const existing = getCategoryItems(key);
    const filtered = existing.filter((p) => p.id !== itemId);
    await updateCategoryItems(key, filtered);
  };

  return (
    <>
      <main className="builder-page">
        <h2 className="builder-title">Build Summary</h2>

        {!user ? (
          <p className="builder-note builder-note-warning">
            You’re not signed in. Parts you pick will only be stored in this
            browser session and will be lost if you close the tab or leave the
            site. Sign in to save your build and enable checkout.
          </p>
        ) : (
          <p className="builder-note">
            Signed in as <strong>{user.name || user.email}</strong>. Your
            selections are linked to your account. Use{" "}
            <strong>Save Build</strong> to add this build to your profile.
          </p>
        )}

        <div className="builder-grid">
          {partTypes.map((part) => {
            const selected = currentBuild[part.key];
            const multi = isMultiCategory(part.key);

            let items = [];
            if (multi) {
              if (Array.isArray(selected)) items = selected;
              else if (selected) items = [selected];
            }

            const primaryPart = multi ? items[0] : selected;
            const extraCount = multi ? Math.max(items.length - 1, 0) : 0;
            const totalQty = multi
              ? items.reduce((sum, item) => sum + (item.quantity || 1), 0)
              : selected
              ? selected.quantity || 1
              : 0;

            const hasSelection = !!selected;

            const handleCardClick = () => {
              if (multi && items.length > 1) {
                openCategoryModal(part.key);
              } else {
                handlePartClick(part.key);
              }
            };

            return (
              <div
                key={part.key}
                className={`builder-card ${
                  hasSelection ? "has-part" : ""
                } clickable-part`}
                onClick={handleCardClick}
              >
                {hasSelection ? (
                  <div className="selected-part-content">
                    <div className="part-category-label">{part.name}</div>

                    <div className="part-image-container">
                      {primaryPart?.image && (
                        <img
                          src={primaryPart.image}
                          alt={primaryPart.name}
                          className="part-image"
                        />
                      )}
                      <button
                        className="remove-part-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePartCategory(part.key);
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <div className="part-details">
                      <h3 className="part-name">{primaryPart?.name}</h3>
                      <p className="part-price">
                        {primaryPart?.price
                          ? formatMoney(parsePriceNumber(primaryPart.price))
                          : ""}
                      </p>

                      {multi && items.length > 0 && (
                        <>
                          <p className="part-qty-summary">
                            Qty: {totalQty}
                            {extraCount > 0 && (
                              <>
                                {" "}
                                · +{extraCount} more item
                                {extraCount > 1 ? "s" : ""}
                              </>
                            )}
                          </p>
                          <button
                            className="view-all-items-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCategoryModal(part.key);
                            }}
                          >
                            View all items
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="empty-part-content">{part.name}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="builder-summary">
          <div className="builder-summary-left">
            <button
              className="builder-clear-btn"
              onClick={handleClearAll}
              disabled={isEmpty}
            >
              Clear All
            </button>
          </div>

          <div className="builder-summary-center">
            <p className="total">
              Total: <span>{totalDisplay}</span>
            </p>
          </div>

          <div className="builder-summary-right">
            {user && !isEmpty && (
              <button
                className="save-build-btn"
                onClick={handleSaveBuild}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Build"}
              </button>
            )}
            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={!user || isEmpty}
            >
              Check Out
            </button>
          </div>
        </div>

        {activeCategoryModal && (
          <div
            className="builder-modal-overlay"
            onClick={(e) => {
              if (e.target.classList.contains("builder-modal-overlay")) {
                closeCategoryModal();
              }
            }}
          >
            <div className="builder-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="builder-modal-title">
                {partTypes.find((p) => p.key === activeCategoryModal)?.name}{" "}
                Items
              </h3>

              <div className="builder-modal-body">
                {getCategoryItems(activeCategoryModal).length === 0 ? (
                  <p>No items in this category.</p>
                ) : (
                  <table className="builder-modal-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCategoryItems(activeCategoryModal).map((item) => {
                        const qty = item.quantity || 1;
                        const unitUsd = parsePriceNumber(item.price);
                        const lineTotalUsd = unitUsd * qty;

                        return (
                          <tr key={item.id}>
                            <td>
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="builder-modal-thumb"
                                />
                              )}
                            </td>
                            <td>{item.name}</td>
                            <td>{qty}</td>
                            <td>
                              {unitUsd > 0 ? formatMoney(unitUsd) : item.price}
                            </td>
                            <td>{formatMoney(lineTotalUsd)}</td>
                            <td>
                              <button
                                className="builder-modal-remove-btn"
                                onClick={() =>
                                  removeItemFromCategory(
                                    activeCategoryModal,
                                    item.id
                                  )
                                }
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="builder-modal-footer">
                <button
                  className="builder-modal-close-btn"
                  onClick={closeCategoryModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showSuccessPopup && (
          <div
            className="success-popup-overlay"
            onClick={(e) => {
              if (e.target.classList.contains("success-popup-overlay")) {
                setShowSuccessPopup(false);
              }
            }}
          >
            <div className="success-popup" onClick={(e) => e.stopPropagation()}>
              <div className="success-icon">✓</div>
              <h3>Thank you for your purchase!</h3>
              <p>Enjoy your new build. 🎉</p>
              <div
                style={{
                  marginTop: "1.25rem",
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center"
                }}
              >
                <button
                  className="confirm-btn"
                  onClick={() => {
                    setShowSuccessPopup(false);
                    navigate("/");
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className={`builder-toast builder-toast-${toast.type}`}>
            {toast.message}
          </div>
        )}
      </main>

      <footer>
        <p>© 2025 PickAPart | For Academic Purposes Only</p>
      </footer>
    </>
  );
}

export default BuildSummary;
