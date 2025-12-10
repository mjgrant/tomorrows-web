import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./style.css";

function SignUp({ setUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (
      !formData.username ||
      !formData.email ||
      !formData.confirmEmail ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      alert("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (formData.email !== formData.confirmEmail) {
      alert("Emails do not match.");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      // Send registration data to backend
      const response = await fetch("http://localhost:5000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success popup
        setShowSuccess(true);
        
        // Auto-redirect after 2 seconds
        setTimeout(() => {
          navigate("/signin");
        }, 2000);
      } else {
        alert(data.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      {/* Success Popup */}
      {showSuccess && (
        <div className="success-popup-overlay">
          <div className="success-popup">
            <div className="success-icon">✓</div>
            <h3>Account Created Successfully!</h3>
            <p>Redirecting you to sign in page...</p>
          </div>
        </div>
      )}

      {/* Sign Up Card */}
      <main className="signin-container">
        <div className="signin-card">
          <h2>Sign Up</h2>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
            />

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
              type="email"
              name="confirmEmail"
              placeholder="Confirm Email"
              value={formData.confirmEmail}
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
              minLength="6"
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
            />

            <div className="terms-text">
              By signing up, you agree to our <a href="#">Terms of Service</a>.
            </div>

            <button 
              type="submit" 
              className="confirm-btn"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "CONFIRM"}
            </button>
          </form>

          <p className="no-account">
            Already have an account?
            <Link to="/signin" className="create-account">
              Sign In
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

export default SignUp;