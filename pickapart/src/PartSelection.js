import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import mockParts from "./mockParts";

function PartSelection({ user, currency }) {
  const { partType } = useParams();
  const navigate = useNavigate();

  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParts, setSelectedParts] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [quantities, setQuantities] = useState({});

  const showAllProducts = partType === "all";

  // categories that allow multiples + quantity
  const MULTI_PART_KEYS = ["memory", "storage", "video-card", "peripherals"];
  const isMultiCategory =
    !showAllProducts && MULTI_PART_KEYS.includes(partType);

  const categoryMap = {
    cpu: "cpu",
    "cpu-cooler": "cpu-cooler",
    motherboard: "motherboard",
    memory: "memory",
    storage: "storage",
    "video-card": "video-card",
    case: "case",
    "power-supply": "power-supply",
    "operating-system": "operating-system",
    peripherals: "peripherals",
    "expansion-card": "expansion-card",
    accessories: "accessories"
  };

  const getDisplayName = (type) => {
    if (type === "all") return "All Products";
    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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

  // Load parts
  useEffect(() => {
    setLoading(true);

    if (showAllProducts) {
      // aggregate + shuffle all parts across categories
      const all = [];
      Object.entries(mockParts).forEach(([key, list]) => {
        (list || []).forEach((p) =>
          all.push({
            ...p,
            __categoryKey: key
          })
        );
      });

      // simple shuffle
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }

      setParts(all);
      const initialQty = {};
      all.forEach((p) => {
        initialQty[p.id] = 1;
      });
      setQuantities(initialQty);
      setSelectedParts(new Set());
      setLoading(false);
      return;
    }

    const category = categoryMap[partType] || partType;
    const data = mockParts[category] || [];
    setParts(data);

    // default quantity = 1 for each row
    const initialQty = {};
    data.forEach((p) => {
      initialQty[p.id] = 1;
    });
    setQuantities(initialQty);

    setSelectedParts(new Set());
    setLoading(false);
  }, [partType, showAllProducts]);

  const togglePartSelection = (partId) => {
    const newSelected = new Set(selectedParts);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedParts(newSelected);
  };

  const selectAll = () => {
    if (selectedParts.size === parts.length) {
      setSelectedParts(new Set());
    } else {
      setSelectedParts(new Set(parts.map((p) => p.id)));
    }
  };

  const handleQtyChange = (partId, value) => {
    let qty = parseInt(value, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    setQuantities((prev) => ({ ...prev, [partId]: qty }));
  };

  const readCurrentBuild = () =>
    JSON.parse(sessionStorage.getItem("currentBuild") || "{}");

  const writeCurrentBuild = async (updatedBuild) => {
    sessionStorage.setItem("currentBuild", JSON.stringify(updatedBuild));

    if (user) {
      try {
        await fetch("http://localhost:5000/api/build/current", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ currentBuild: updatedBuild })
        });
      } catch (err) {
        console.error("Error updating current build from PartSelection:", err);
      }
    }
  };

  // Helper to insert / update one part in the build, respecting multi categories
  const upsertPartIntoBuild = (build, part, qty, categoryKey) => {
    const key = categoryKey;

    if (MULTI_PART_KEYS.includes(key)) {
      const existingRaw = build[key];
      let arr = [];

      if (Array.isArray(existingRaw)) arr = [...existingRaw];
      else if (existingRaw) arr = [existingRaw];

      const index = arr.findIndex((p) => p.id === part.id);

      if (index >= 0) {
        const existing = arr[index];
        arr[index] = {
          ...existing,
          quantity: (existing.quantity || 1) + qty
        };
      } else {
        arr.push({
          ...part,
          type: key,
          displayName: getDisplayName(key),
          quantity: qty
        });
      }

      build[key] = arr;
    } else {
      // single-part category
      build[key] = {
        ...part,
        type: key,
        displayName: getDisplayName(key),
        quantity: qty
      };
    }
  };

  // Add a single row via its Add button
  const handleAddToBuild = async (part) => {
    const currentBuild = readCurrentBuild();
    const qty = quantities[part.id] || 1;

    const categoryKey = showAllProducts ? part.__categoryKey : partType;

    upsertPartIntoBuild(currentBuild, part, qty, categoryKey);
    await writeCurrentBuild(currentBuild);

    navigate("/builder");
  };

  // Add all selected rows (for multi categories)
  const handleAddSelected = async () => {
    if (!isMultiCategory || selectedParts.size === 0) return;

    const currentBuild = readCurrentBuild();

    selectedParts.forEach((id) => {
      const part = parts.find((p) => p.id === id);
      if (!part) return;
      const qty = quantities[id] || 1;
      upsertPartIntoBuild(currentBuild, part, qty, partType);
    });

    await writeCurrentBuild(currentBuild);
    navigate("/builder");
  };

  const NO_IMAGE = "/images/noimg.png";

  if (loading) {
    return (
      <div className="part-selection-page">
        <div className="loading">
          Loading {getDisplayName(partType)} options...
        </div>
      </div>
    );
  }

  // render for "all products" view
  if (showAllProducts) {
    return (
      <div className="part-selection-page">
        <div className="part-selection-header">
          <button className="back-btn" onClick={() => navigate("/builder")}>
            ← Back to Builder
          </button>

          <div className="header-content">
            <h1>{parts.length} Available Products</h1>
            <div className="selection-actions">
              <button className="select-all-btn" onClick={selectAll}>
                {selectedParts.size === parts.length && parts.length > 0
                  ? "Select None"
                  : "Select All"}
              </button>
              <button className="compare-btn" disabled>
                Browse Catalogue
              </button>
            </div>
          </div>
        </div>

        {!user && (
          <div className="price-alert-banner">
            🔔 Log in to set price alerts and save builds
          </div>
        )}

        {previewImage && (
          <div
            className="image-preview-overlay"
            onClick={(e) => {
              if (e.target.classList.contains("image-preview-overlay")) {
                setPreviewImage(null);
              }
            }}
          >
            <div
              className="image-preview-container"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage || NO_IMAGE}
                alt="Part preview"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = NO_IMAGE;
                }}
              />
              <button
                className="close-preview"
                onClick={() => setPreviewImage(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="parts-table-container">
          <table className="parts-table">
            <thead>
              <tr>
                <th className="select-col">
                  <input
                    type="checkbox"
                    checked={
                      selectedParts.size === parts.length && parts.length > 0
                    }
                    onChange={selectAll}
                  />
                </th>
                <th>Category</th>
                <th>Image</th>
                <th>Name</th>
                <th>Rating</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => {
                const usd = parsePriceNumber(part.price);
                const displayPrice =
                  usd > 0 ? formatMoney(usd) : part.price || "–";

                return (
                  <tr
                    key={part.id + "-" + part.__categoryKey}
                    className={selectedParts.has(part.id) ? "selected" : ""}
                  >
                    <td className="select-col">
                      <input
                        type="checkbox"
                        checked={selectedParts.has(part.id)}
                        onChange={() => togglePartSelection(part.id)}
                      />
                    </td>
                    <td>{getDisplayName(part.__categoryKey)}</td>
                    <td className="image-col">
                      <div className="part-image-thumbnail">
                        <img
                          src={part.image || NO_IMAGE}
                          alt={part.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = NO_IMAGE;
                          }}
                        />
                        <button
                          type="button"
                          className="view-image-text"
                          onClick={() =>
                            setPreviewImage(part.image || NO_IMAGE)
                          }
                        >
                          View
                        </button>
                      </div>
                    </td>
                    <td className="part-name">
                      <strong>{part.name}</strong>
                      <div className="part-brand">{part.brand}</div>
                    </td>
                    <td className="rating">⭐ {part.rating ?? "4.5"}</td>
                    <td className="price">
                      <strong>{displayPrice}</strong>
                    </td>
                    <td className="action">
                      <button
                        className="add-btn"
                        onClick={() => handleAddToBuild(part)}
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Filters UI (still cosmetic) */}
        <div className="filters-section">
          <button
            className="filters-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "▲" : "▼"} Add From Filter
          </button>

          {showFilters && (
            <div className="filters-panel">
              <h3>Filter Options</h3>
              <div className="filter-group">
                <label>Brand:</label>
                <select>
                  <option>All Brands</option>
                  <option>AMD</option>
                  <option>Intel</option>
                  <option>NVIDIA</option>
                  <option>ASUS</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Price Range:</label>
                <select>
                  <option>Any Price</option>
                  <option>Under $100</option>
                  <option>$100 - $300</option>
                  <option>$300 - $500</option>
                  <option>Over $500</option>
                </select>
              </div>
              <button className="apply-filters">Apply Filters</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // normal single-category render
  return (
    <div className="part-selection-page">
      <div className="part-selection-header">
        <button className="back-btn" onClick={() => navigate("/builder")}>
          ← Back to Builder
        </button>

        <div className="header-content">
          <h1>
            {parts.length} Available {getDisplayName(partType)} Options{" "}
          </h1>
          <div className="selection-actions">
            <button className="select-all-btn" onClick={selectAll}>
              {selectedParts.size === parts.length && parts.length > 0
                ? "Select None"
                : "Select All"}
            </button>

            {isMultiCategory ? (
              <button
                className="compare-btn"
                disabled={selectedParts.size === 0}
                onClick={handleAddSelected}
              >
                Add Selected ({selectedParts.size})
              </button>
            ) : (
              <button
                className="compare-btn"
                disabled={selectedParts.size < 2}
              >
                Compare Selected ({selectedParts.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {!user && (
        <div className="price-alert-banner">
          🔔 Log in to set price alerts and save builds
        </div>
      )}

      {previewImage && (
        <div
          className="image-preview-overlay"
          onClick={(e) => {
            if (e.target.classList.contains("image-preview-overlay")) {
              setPreviewImage(null);
            }
          }}
        >
          <div
            className="image-preview-container"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage || NO_IMAGE}
              alt="Part preview"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = NO_IMAGE;
              }}
            />
            <button
              className="close-preview"
              onClick={() => setPreviewImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="parts-table-container">
        <table className="parts-table">
          <thead>
            <tr>
              <th className="select-col">
                <input
                  type="checkbox"
                  checked={
                    selectedParts.size === parts.length && parts.length > 0
                  }
                  onChange={selectAll}
                />
              </th>
              <th>Image</th>
              <th>Name</th>

              {partType === "cpu" && (
                <>
                  <th>Core Count</th>
                  <th>Clock</th>
                  <th>Boost</th>
                  <th>Socket</th>
                  <th>TDP</th>
                  <th>Graphics</th>
                </>
              )}

              {partType === "motherboard" && (
                <>
                  <th>Socket</th>
                  <th>Chipset</th>
                  <th>Form Factor</th>
                  <th>Memory Type</th>
                  <th>Max Memory</th>
                </>
              )}

              {partType === "memory" && (
                <>
                  <th>Capacity</th>
                  <th>Modules</th>
                  <th>Speed</th>
                  <th>Type</th>
                </>
              )}

              {partType === "storage" && (
                <>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Interface</th>
                  <th>Form Factor</th>
                </>
              )}

              {partType === "video-card" && (
                <>
                  <th>Chipset</th>
                  <th>VRAM</th>
                  <th>Length</th>
                  <th>Recommended PSU</th>
                </>
              )}

              {partType === "case" && (
                <>
                  <th>Form Factor</th>
                  <th>Max GPU Length</th>
                  <th>Max Cooler Height</th>
                </>
              )}

              {partType === "power-supply" && (
                <>
                  <th>Wattage</th>
                  <th>Efficiency</th>
                  <th>Modular</th>
                </>
              )}

              {partType === "operating-system" && (
                <>
                  <th>Edition</th>
                  <th>License</th>
                  <th>Bit</th>
                </>
              )}

              {partType === "peripherals" && (
                <>
                  <th>Type</th>
                  <th>Connection</th>
                </>
              )}

              {partType === "expansion-card" && (
                <>
                  <th>Interface</th>
                  <th>Function</th>
                </>
              )}

              {partType === "accessories" && (
                <>
                  <th>Type</th>
                </>
              )}

              <th>Rating</th>
              <th>Price</th>
              {isMultiCategory && <th>Qty</th>}
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {parts.map((part) => {
              const usd = parsePriceNumber(part.price);
              const displayPrice =
                usd > 0 ? formatMoney(usd) : part.price || "–";

              return (
                <tr
                  key={part.id}
                  className={selectedParts.has(part.id) ? "selected" : ""}
                >
                  <td className="select-col">
                    <input
                      type="checkbox"
                      checked={selectedParts.has(part.id)}
                      onChange={() => togglePartSelection(part.id)}
                    />
                  </td>

                  <td className="image-col">
                    <div className="part-image-thumbnail">
                      <img
                        src={part.image || NO_IMAGE}
                        alt={part.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = NO_IMAGE;
                        }}
                      />
                      <button
                        type="button"
                        className="view-image-text"
                        onClick={() =>
                          setPreviewImage(part.image || NO_IMAGE)
                        }
                      >
                        View
                      </button>
                    </div>
                  </td>

                  <td className="part-name">
                    <strong>{part.name}</strong>
                    <div className="part-brand">{part.brand}</div>
                  </td>

                  {partType === "cpu" && (
                    <>
                      <td>{part.coreCount || "N/A"}</td>
                      <td>{part.clockSpeed || "N/A"}</td>
                      <td>{part.boostClock || "N/A"}</td>
                      <td>{part.socket || "N/A"}</td>
                      <td>{part.tdp || "N/A"}</td>
                      <td>{part.graphics || "N/A"}</td>
                    </>
                  )}

                  {partType === "motherboard" && (
                    <>
                      <td>{part.socket || "N/A"}</td>
                      <td>{part.chipset || "N/A"}</td>
                      <td>{part.formFactor || "N/A"}</td>
                      <td>{part.memoryType || "N/A"}</td>
                      <td>{part.maxMemory || "N/A"}</td>
                    </>
                  )}

                  {partType === "memory" && (
                    <>
                      <td>
                        {part.capacityGB ? `${part.capacityGB} GB` : "N/A"}
                      </td>
                      <td>{part.modules || "N/A"}</td>
                      <td>
                        {part.speedMHz ? `${part.speedMHz} MHz` : "N/A"}
                      </td>
                      <td>{part.memoryType || "N/A"}</td>
                    </>
                  )}

                  {partType === "storage" && (
                    <>
                      <td>{part.storageType || "N/A"}</td>
                      <td>{part.capacity || "N/A"}</td>
                      <td>{part.interface || "N/A"}</td>
                      <td>{part.formFactor || "N/A"}</td>
                    </>
                  )}

                  {partType === "video-card" && (
                    <>
                      <td>{part.chipset || "N/A"}</td>
                      <td>{part.vram || "N/A"}</td>
                      <td>{part.length || "N/A"}</td>
                      <td>{part.recommendedPsu || "N/A"}</td>
                    </>
                  )}

                  {partType === "case" && (
                    <>
                      <td>{part.formFactor || "N/A"}</td>
                      <td>{part.gpuMaxLength || "N/A"}</td>
                      <td>{part.cpuCoolerMaxHeight || "N/A"}</td>
                    </>
                  )}

                  {partType === "power-supply" && (
                    <>
                      <td>{part.wattage ? `${part.wattage} W` : "N/A"}</td>
                      <td>{part.efficiency || "N/A"}</td>
                      <td>{part.modular || "N/A"}</td>
                    </>
                  )}

                  {partType === "operating-system" && (
                    <>
                      <td>{part.edition || "N/A"}</td>
                      <td>{part.licenseType || "N/A"}</td>
                      <td>{part.bit || "N/A"}</td>
                    </>
                  )}

                  {partType === "peripherals" && (
                    <>
                      <td>{part.peripheralType || "N/A"}</td>
                      <td>{part.connection || "N/A"}</td>
                    </>
                  )}

                  {partType === "expansion-card" && (
                    <>
                      <td>{part.interface || "N/A"}</td>
                      <td>{part.function || "N/A"}</td>
                    </>
                  )}

                  {partType === "accessories" && (
                    <>
                      <td>{part.accessoryType || "N/A"}</td>
                    </>
                  )}

                  <td className="rating">⭐ {part.rating ?? "4.5"}</td>
                  <td className="price">
                    <strong>{displayPrice}</strong>
                  </td>

                  {isMultiCategory && (
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="qty-input"
                        value={quantities[part.id] ?? 1}
                        onChange={(e) =>
                          handleQtyChange(part.id, e.target.value)
                        }
                      />
                    </td>
                  )}

                  <td className="action">
                    <button
                      className="add-btn"
                      onClick={() => handleAddToBuild(part)}
                    >
                      Add
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Filters UI (still cosmetic) */}
      <div className="filters-section">
        <button
          className="filters-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "▲" : "▼"} Add From Filter
        </button>

        {showFilters && (
          <div className="filters-panel">
            <h3>Filter Options</h3>
            <div className="filter-group">
              <label>Brand:</label>
              <select>
                <option>All Brands</option>
                <option>AMD</option>
                <option>Intel</option>
                <option>NVIDIA</option>
                <option>ASUS</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Price Range:</label>
              <select>
                <option>Any Price</option>
                <option>Under $100</option>
                <option>$100 - $300</option>
                <option>$300 - $500</option>
                <option>Over $500</option>
              </select>
            </div>
            <button className="apply-filters">Apply Filters</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PartSelection;
