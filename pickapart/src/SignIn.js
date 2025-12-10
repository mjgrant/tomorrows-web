import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./style.css";

function SignIn({ setUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.email || !formData.password) {
      alert("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update user state in App.js
        if (setUser) {
          setUser(data.user);
        }
        
        // Redirect to home page
        navigate("/");
      } else {
        alert(data.error || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page">
      {/* Sign In Card */}
      <main className="signin-container">
        <div className="signin-card">
          <h2>SIGN IN</h2>

          <form onSubmit={handleEmailLogin}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />

            <a href="#" className="forgot">
              Forgot Password?
            </a>

            <button 
              type="submit" 
              className="confirm-btn"
              disabled={loading}
            >
              {loading ? "SIGNING IN..." : "CONFIRM"}
            </button>
          </form>

          {/* Separator Line */}
          <div className="separator">
            <span>or</span>
          </div>

          {/* Google Button */}
          <button 
            onClick={() => window.location.href = "http://localhost:5000/auth/google"}
            className="google-btn"
            disabled={loading}
          >
            <span className="google-icon">G</span>
            Continue with Google
          </button>

          <p className="no-account">
            Don't have an account yet?
            <Link to="/signup" className="create-account">
              Create an Account
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer>
        <p>© 2025 PickAPart | For Academic Purposes Only</p>
      </footer>
    </div>
  );  
}

export default SignIn;