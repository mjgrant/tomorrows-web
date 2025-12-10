import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./style.css";
import SignIn from "./SignIn";
import SignUp from "./SignUp";
import BuildSummary from "./BuildSummary";
import Header from "./Header";
import Profile from "./Profile";
import PartSelection from "./PartSelection.js";

// Landing Page component (without header since Header is now separate)
function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>Pick Parts. Build Your PC. Compare and Share.</h1>
          <p>
            We provide part selection, pricing, and compatibility guidance for
            do-it-yourself computer builders.
          </p>
          <button onClick={() => window.location.href = "/builder"}>
            🚀 Start Your Build
          </button>
        </div>
      </section>

      {/* Builder Section (preview only) */}
      <section className="part-list" id="builder">
        <h2>Your Part List</h2>
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Selection</th>
              <th>Price</th>
              <th>Where</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>CPU</td><td>–</td><td>–</td><td>–</td></tr>
            <tr><td>Motherboard</td><td>–</td><td>–</td><td>–</td></tr>
            <tr><td>Memory</td><td>–</td><td>–</td><td>–</td></tr>
          </tbody>
        </table>
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

  // Fetch logged-in user on page load
  useEffect(() => {
    fetch("http://localhost:5000/auth/user", {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => setUser(data));
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
      <Header theme={theme} toggleTheme={toggleTheme} user={user} />
      
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignIn setUser={setUser} />} />
        <Route path="/signup" element={<SignUp setUser={setUser} />} />
        <Route path="/builder" element={<BuildSummary user={user} />} />
        <Route path="/profile" element={<Profile user={user} />} />
        <Route path="/parts/:partType" element={<PartSelection user={user} />} />
      </Routes>
    </Router>
  );
}

export default App;