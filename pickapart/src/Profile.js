import React, { useState, useEffect } from "react";

function Profile({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    bio: "",
    location: ""
  });
  const [savedBuilds, setSavedBuilds] = useState([]);

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        location: user.location || ""
      });
      
      // Load saved builds (mock data for now)
      setSavedBuilds([
        { id: 1, name: "Gaming PC Build", total: "$1,200", date: "2024-01-15" },
        { id: 2, name: "Workstation Build", total: "$2,500", date: "2024-01-10" }
      ]);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      // Update user profile in backend
      const response = await fetch("http://localhost:5000/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsEditing(false);
        // You might want to update the user context/state here
        console.log("Profile updated successfully");
      } else {
        console.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:5000/auth/logout", {
        method: "POST",
        credentials: "include"
      });

      if (response.ok) {
        // Redirect to home page or refresh to update auth state
        window.location.href = "/";
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const deleteBuild = (buildId) => {
    setSavedBuilds(prev => prev.filter(build => build.id !== buildId));
    // In a real app, you'd also call your backend API here
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="not-logged-in">
          <h1>Profile</h1>
          <p>Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Your Profile</h1>
        <div className="profile-actions">
          {!isEditing ? (
            <button 
              className="edit-btn"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          ) : (
            <div className="edit-actions">
              <button className="save-btn" onClick={handleSave}>
                Save Changes
              </button>
              <button 
                className="cancel-btn"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-info">
          <h2>Personal Information</h2>
          <div className="info-grid">
            <div className="info-field">
              <label>Username</label>
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="edit-input"
                />
              ) : (
                <p>{formData.username}</p>
              )}
            </div>

            <div className="info-field">
              <label>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="edit-input"
                />
              ) : (
                <p>{formData.email}</p>
              )}
            </div>

            <div className="info-field">
              <label>Bio</label>
              {isEditing ? (
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="edit-textarea"
                  placeholder="Tell us about yourself..."
                  rows="3"
                />
              ) : (
                <p>{formData.bio || "No bio yet..."}</p>
              )}
            </div>

            <div className="info-field">
              <label>Location</label>
              {isEditing ? (
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="Your location"
                />
              ) : (
                <p>{formData.location || "Not specified"}</p>
              )}
            </div>
          </div>
        </div>

        <div className="saved-builds">
          <h2>Your Saved Builds</h2>
          {savedBuilds.length > 0 ? (
            <div className="builds-list">
              {savedBuilds.map(build => (
                <div key={build.id} className="build-card">
                  <div className="build-info">
                    <h3>{build.name}</h3>
                    <p>Total: {build.total}</p>
                    <p>Created: {build.date}</p>
                  </div>
                  <div className="build-actions">
                    <button className="view-build-btn">View</button>
                    <button 
                      className="delete-build-btn"
                      onClick={() => deleteBuild(build.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No saved builds yet. Start building!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;