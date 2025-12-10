import { Link } from "react-router-dom";

function Header({ theme, toggleTheme, user }) {
  return (
    <header>
      <div className="top-bar">
        <div className="logo">
          <Link to="/">🖥️ PickAPart</Link>
        </div>

        <div className="top-actions">
          {/* CHANGES BASED ON LOGIN STATUS */}
          {user ? (
            <Link to="/profile" className="profile-link">
              <span className="profile-icon">👤</span>
              <span className="username">{user.name || user.email}</span>
            </Link>
          ) : (
            <>
              <Link to="/signin">Sign In</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          )}

          <select className="language">
            <option>United States</option>
            <option>United Kingdom</option>
            <option>Canada</option>
          </select>

          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "light" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* bottom nav */}
      <nav className="main-nav">
        <ul>
          <li><Link to="/builder">Builder</Link></li>
          <li><a href="#">Products ▾</a></li>
          <li><a href="#">Guides</a></li>
          <li><a href="#">Completed Builds</a></li>
          <li><a href="#">Trends</a></li>
          <li><a href="#">Benchmarks</a></li>
          <li><a href="#">Forums</a></li>
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