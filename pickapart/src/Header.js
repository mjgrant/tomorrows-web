import { Link } from "react-router-dom";

function Header({
  theme,
  toggleTheme,
  user,
  currency,
  currencyOptions,
  onCurrencyChange
}) {
  const productCategories = [
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

  return (
    <header>
      <div className="top-bar">
        <div className="logo">
          <Link to="/">🖥️ PickAPart</Link>
        </div>

        <div className="top-actions">
          {user ? (
            <Link to="/profile" className="profile-link">
              <span className="profile-icon">👤</span>
              <span className="username">
                {user.name || user.email}
                {user.isAdmin ? " (Admin)" : ""}
              </span>
            </Link>
          ) : (
            <>
              <Link to="/signin">Sign In</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          )}

          {/* Currency selector */}
          <select
            className="language"
            value={currency?.code || "USD"}
            onChange={(e) => onCurrencyChange(e.target.value)}
          >
            {currencyOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>

          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "light" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* bottom nav */}
      <nav className="main-nav">
        <ul className="nav-links">
          <li className="nav-item">
            <Link to="/builder" className="nav-link">
              Builder
            </Link>
          </li>

          {/* Products dropdown */}
          <li className="nav-item nav-dropdown">
            <Link to="/parts/all" className="nav-link nav-dropdown-toggle">
              Products ▾
            </Link>

            <ul className="nav-dropdown-menu">
              {productCategories.map((cat) => (
                <li key={cat.key}>
                  <Link to={`/parts/${cat.key}`}>{cat.label}</Link>
                </li>
              ))}
            </ul>
          </li>

          {/* Saved builds just goes to Profile */}
          <li className="nav-item">
            <Link to="/profile" className="nav-link">
              Saved Builds
            </Link>
          </li>

          {/* Admin link shown only for admin accounts */}
          {user && user.isAdmin && (
            <li className="nav-item">
              <Link to="/admin" className="nav-link">
                Admin
              </Link>
            </li>
          )}
        </ul>

        <div className="search">
          <input type="text" placeholder="Search..." />
          <button>🔍</button>
        </div>
      </nav>
    </header>
  );
}

export default Header;
