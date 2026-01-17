import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./style.css";
import SignIn from "./SignIn";
import SignUp from "./SignUp";
import BuildSummary from "./BuildSummary";
import Header from "./Header";
import Profile from "./Profile";
import PartSelection from "./PartSelection.js";
import AdminPanel from "./AdminPanel";

const API_BASE = "http://localhost:5000";

// order + labels we use for the landing page table
const PART_ORDER = [
  { key: "cpu", label: "CPU" },
  { key: "cpu-cooler", label: "CPU Cooler" },
  { key: "motherboard", label: "Motherboard" },
  { key: "memory", label: "Memory" },
  { key: "storage", label: "Storage" },
  { key: "video-card", label: "Video Card" },
  { key: "case", label: "Case" },
  { key: "power-supply", label: "Power Supply" },
  { key: "operating-system", label: "Operating System" },
  { key: "peripherals", label: "Peripherals" },
  { key: "expansion-card", label: "Expansion Cards" },
  { key: "accessories", label: "Accessories / Other" }
];

// which categories can have multiple entries/quantity
const MULTI_PART_KEYS = ["memory", "storage", "video-card", "peripherals"];

// helper to pull just the numeric portion out of "$199.99"
const parsePriceNumber = (price) => {
  if (!price) return 0;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};

// usd to specific currency rate at the time of creation
const CURRENCIES = {
  USD: {
    code: "USD",
    symbol: "$",
    label: "United States (USD)",
    rate: 1
  },
  AED: {
    code: "AED",
    symbol: "AED",
    label: "United Arab Emirates (AED)",
    rate: 3.67
  },
  PHP: {
    code: "PHP",
    symbol: "PHP",
    label: "Philippines (PHP)",
    rate: 56
  },
  SGD: {
    code: "SGD",
    symbol: "SGD",
    label: "Singapore (SGD)",
    rate: 1.35
  },
  MYR: {
    code: "MYR",
    symbol: "RM",
    label: "Malaysia (MYR)",
    rate: 4.7
  },
  THB: {
    code: "THB",
    symbol: "THB",
    label: "Thailand (THB)",
    rate: 36
  },
  IDR: {
    code: "IDR",
    symbol: "IDR",
    label: "Indonesia (IDR)",
    rate: 15500
  },
  SAR: {
    code: "SAR",
    symbol: "SAR",
    label: "Saudi Arabia (SAR)",
    rate: 3.75
  },
  QAR: {
    code: "QAR",
    symbol: "QAR",
    label: "Qatar (QAR)",
    rate: 3.64
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    label: "Eurozone (EUR)",
    rate: 0.93
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    label: "United Kingdom (GBP)",
    rate: 0.8
  },
  INR: {
    code: "INR",
    symbol: "₹",
    label: "India (INR)",
    rate: 83
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    label: "Japan (JPY)",
    rate: 150
  }
};

const CURRENCY_LIST = Object.values(CURRENCIES);

// Landing Page component
function LandingPage({ user, currency }) {
  const [currentBuild, setCurrentBuild] = useState({});
  const [loading, setLoading] = useState(true);

  // load current build (server for logged in, sessionStorage otherwise)
  useEffect(() => {
    const loadBuild = async () => {
      setLoading(true);
      try {
        if (user) {
          const res = await fetch(`${API_BASE}/api/build/current`, {
            credentials: "include"
          });

          if (res.ok) {
            const data = await res.json();
            if (data.currentBuild) {
              setCurrentBuild(data.currentBuild);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Error loading current build on landing page:", err);
      }

      // fallback for guest / error: sessionStorage
      const sessionBuild = JSON.parse(
        sessionStorage.getItem("currentBuild") || "{}"
      );
      setCurrentBuild(sessionBuild);
      setLoading(false);
    };

    loadBuild();
  }, [user]);

  const hasAnyParts =
    currentBuild && Object.keys(currentBuild || {}).length > 0;

  // format USD amount into current currency (symbol + plain number)
  const formatMoney = (usdAmount) => {
    const rate = currency?.rate || 1;
    const symbol = currency?.symbol || "$";
    const converted = usdAmount * rate;
    return `${symbol} ${converted.toFixed(2)}`;
  };

  // build rows for the table
  const rows = [];
  let grandTotalUsd = 0;

  PART_ORDER.forEach(({ key, label }) => {
    const value = currentBuild[key];
    const isMulti = MULTI_PART_KEYS.includes(key);

    if (!value) {
      rows.push({
        id: `${key}-empty`,
        component: label,
        partName: "–",
        qty: "–",
        price: "–",
        subtotal: "–"
      });
      return;
    }

    const partsArray = isMulti
      ? Array.isArray(value)
        ? value
        : [value]
      : [Array.isArray(value) ? value[0] : value];

    partsArray.forEach((part, index) => {
      const qty = part.quantity || 1;
      const priceNumUsd = parsePriceNumber(part.price);
      const lineTotalUsd = priceNumUsd * qty;
      grandTotalUsd += lineTotalUsd;

      rows.push({
        id: `${key}-${part.id || index}`,
        component: index === 0 ? label : "",
        partName: part.name || "Unknown part",
        qty,
        price: priceNumUsd > 0 ? formatMoney(priceNumUsd) : "–",
        subtotal:
          lineTotalUsd > 0 ? formatMoney(lineTotalUsd) : "–"
      });
    });
  });

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <h1>Pick Parts. Build Your PC. Compare and Share.</h1>
          <p>
            We provide part selection, pricing, and compatibility guidance for
            do-it-yourself computer builders.
          </p>
          <button onClick={() => (window.location.href = "/builder")}>
            🚀 Start Your Build
          </button>
        </div>
      </section>

      <section className="part-list" id="builder">
        <h2>Your Part List</h2>

        {loading ? (
          <p style={{ textAlign: "center", padding: "1rem" }}>
            Loading your build...
          </p>
        ) : (
          <>
            {!hasAnyParts && (
              <p style={{ textAlign: "center", marginBottom: "1rem" }}>
                {user
                  ? "You don't have anything in your current build yet."
                  : "You haven't started a build in this session yet."}
              </p>
            )}

            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Selection</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.component}</td>
                    <td>{row.partName}</td>
                    <td>{row.qty}</td>
                    <td>{row.price}</td>
                    <td>{row.subtotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "1rem",
                fontWeight: 600
              }}
            >
              <span style={{ marginRight: "0.5rem" }}>Total:</span>
              <span style={{ color: "#10b981" }}>
                {formatMoney(grandTotalUsd)}
              </span>
            </div>

            {!user && (
              <p
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.9rem",
                  opacity: 0.8,
                  textAlign: "center"
                }}
              >
                Parts you pick as a guest are only stored in this browser
                session and will be lost when you leave the site. Sign in to
                save your builds to your profile.
              </p>
            )}
          </>
        )}
      </section>

      <footer>
        <p>© 2025 PickAPart | For Academic Purposes Only</p>
      </footer>
    </>
  );
}

function App() {
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") === "light" ? "light" : "dark"
  );
  const [user, setUser] = useState(null);

  // currency selection
  const [currencyCode, setCurrencyCode] = useState(
    localStorage.getItem("currencyCode") || "USD"
  );
  const currency =
    CURRENCIES[currencyCode] || CURRENCIES.USD;

  const handleCurrencyChange = (code) => {
    setCurrencyCode(code);
    localStorage.setItem("currencyCode", code);
  };

  useEffect(() => {
    fetch(`${API_BASE}/auth/user`, {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => setUser(data));
  }, []);

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-mode");
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.remove("light-mode");
      localStorage.setItem("theme", "dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Router>
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        currency={currency}
        currencyOptions={CURRENCY_LIST}
        onCurrencyChange={handleCurrencyChange}
      />

      <Routes>
        <Route
          path="/"
          element={<LandingPage user={user} currency={currency} />}
        />
        <Route
          path="/signin"
          element={<SignIn setUser={setUser} />}
        />
        <Route
          path="/signup"
          element={<SignUp setUser={setUser} />}
        />
        <Route
          path="/builder"
          element={<BuildSummary user={user} currency={currency} />}
        />
        <Route
          path="/profile"
          element={<Profile user={user} />}
        />
        <Route
          path="/parts/:partType"
          element={<PartSelection user={user} currency={currency} />}
        />
        <Route
          path="/admin"
          element={<AdminPanel user={user} />}
        />
        <Route
          path="/builder/:buildId"
          element={<BuildSummary user={user} currency={currency} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
