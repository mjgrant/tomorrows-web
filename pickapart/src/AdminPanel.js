import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000";

function AdminPanel({ user }) {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [parts, setParts] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);

  const [newPart, setNewPart] = useState({
    name: "",
    type: "",
    brand: "",
    price: "",
    image: ""
  });

  const [confirmState, setConfirmState] = useState(null);

  // LOAD USERS
  useEffect(() => {
    if (!user || !user.isAdmin || activeTab !== "users") return;

    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const res = await fetch(`${API_BASE}/api/admin/users`, {
          credentials: "include"
        });
        const data = await res.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      } catch (err) {
        console.error("Failed to load users:", err);
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [activeTab, user]);

  // LOAD PARTS
  useEffect(() => {
    if (!user || !user.isAdmin || activeTab !== "parts") return;

    const fetchParts = async () => {
      try {
        setPartsLoading(true);
        const res = await fetch(`${API_BASE}/api/admin/parts`, {
          credentials: "include"
        });
        const data = await res.json();
        setParts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load parts:", err);
        setParts([]);
      } finally {
        setPartsLoading(false);
      }
    };

    fetchParts();
  }, [activeTab, user]);

  // USER ACTIONS
  const toggleUserAdmin = async (u) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u._id}/admin`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ makeAdmin: !u.isAdmin })
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error("Failed to toggle admin:", errData);
        return;
      }

      const { user: updatedUser } = await res.json();

      setUsers((prev) =>
        prev.map((x) => (x._id === updatedUser._id ? updatedUser : x))
      );
    } catch (err) {
      console.error("Failed to toggle admin:", err);
    }
  };

  // open confirm overlay for deleting user
  const requestDeleteUser = (u) => {
    setConfirmState({
      type: "deleteUser",
      user: u,
      message: `Delete user ${u.email || u.name}?`
    });
  };

  // PART ACTIONS
  const handleNewPartChange = (e) => {
    const { name, value } = e.target;
    setNewPart((prev) => ({ ...prev, [name]: value }));
  };

  const createPart = async (e) => {
    e.preventDefault();
    if (!newPart.name || !newPart.type) {
      alert("Name and type are required");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newPart)
      });
      const created = await res.json();
      setParts((prev) => [created, ...prev]);
      setNewPart({ name: "", type: "", brand: "", price: "", image: "" });
    } catch (err) {
      console.error("Failed to create part:", err);
    }
  };

  const togglePartActive = async (part) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/parts/${part._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...part, isActive: !part.isActive })
      });
      const updated = await res.json();
      setParts((prev) =>
        prev.map((p) => (p._id === updated._id ? updated : p))
      );
    } catch (err) {
      console.error("Failed to toggle part:", err);
    }
  };

  // open confirm overlay for deleting part
  const requestDeletePart = (part) => {
    setConfirmState({
      type: "deletePart",
      part,
      message: `Delete part "${part.name}"?`
    });
  };

  // handle confirm overlay "OK" click
  const handleConfirm = async () => {
    if (!confirmState) return;

    try {
      if (confirmState.type === "deleteUser" && confirmState.user) {
        const u = confirmState.user;
        const res = await fetch(`${API_BASE}/api/admin/users/${u._id}`, {
          method: "DELETE",
          credentials: "include"
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Failed to delete user");
        } else {
          setUsers((prev) => prev.filter((x) => x._id !== u._id));
        }
      }

      if (confirmState.type === "deletePart" && confirmState.part) {
        const part = confirmState.part;
        const res = await fetch(`${API_BASE}/api/admin/parts/${part._id}`, {
          method: "DELETE",
          credentials: "include"
        });
        if (!res.ok) {
          alert("Failed to delete part");
        } else {
          setParts((prev) => prev.filter((p) => p._id !== part._id));
        }
      }
    } catch (err) {
      console.error("Error performing confirmed action:", err);
    } finally {
      setConfirmState(null);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmState(null);
  };

  return (
    <main className="admin-page">
      <h2>Admin Panel</h2>

      {/* If not admin, just show message */}
      {(!user || !user.isAdmin) && (
        <p>You do not have permission to view this page.</p>
      )}

      {user && user.isAdmin && (
        <>
          <div className="admin-tabs">
            <button
              className={activeTab === "users" ? "active" : ""}
              onClick={() => setActiveTab("users")}
            >
              Users
            </button>
            <button
              className={activeTab === "parts" ? "active" : ""}
              onClick={() => setActiveTab("parts")}
            >
              Parts
            </button>
          </div>

          {activeTab === "users" && (
            <section className="admin-section">
              <h3>Manage Users</h3>
              {usersLoading ? (
                <p>Loading users...</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Admin?</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.username}</td>
                        <td>{u.isAdmin ? "Yes" : "No"}</td>
                        <td>
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>
                          <button onClick={() => toggleUserAdmin(u)}>
                            {u.isAdmin ? "Remove Admin" : "Make Admin"}
                          </button>
                          <button
                            onClick={() => requestDeleteUser(u)}
                            style={{ marginLeft: "0.5rem" }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !usersLoading && (
                      <tr>
                        <td colSpan="6">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {activeTab === "parts" && (
            <section className="admin-section">
              <h3>Manage Parts (Admin Catalog)</h3>

              <form className="admin-form" onSubmit={createPart}>
                <div className="form-row">
                  <input
                    name="name"
                    value={newPart.name}
                    onChange={handleNewPartChange}
                    placeholder="Part name"
                  />
                  <input
                    name="type"
                    value={newPart.type}
                    onChange={handleNewPartChange}
                    placeholder="Type (e.g. cpu)"
                  />
                  <input
                    name="brand"
                    value={newPart.brand}
                    onChange={handleNewPartChange}
                    placeholder="Brand"
                  />
                  <input
                    name="price"
                    value={newPart.price}
                    onChange={handleNewPartChange}
                    placeholder="Price (e.g. $199)"
                  />
                  <input
                    name="image"
                    value={newPart.image}
                    onChange={handleNewPartChange}
                    placeholder="Image URL"
                  />
                  <button type="submit">Add Part</button>
                </div>
              </form>

              {partsLoading ? (
                <p>Loading parts...</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Brand</th>
                      <th>Price</th>
                      <th>Active?</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p) => (
                      <tr key={p._id}>
                        <td>{p.name}</td>
                        <td>{p.type}</td>
                        <td>{p.brand}</td>
                        <td>{p.price}</td>
                        <td>{p.isActive ? "Yes" : "No"}</td>
                        <td>
                          <button onClick={() => togglePartActive(p)}>
                            {p.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => requestDeletePart(p)}
                            style={{ marginLeft: "0.5rem" }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {parts.length === 0 && !partsLoading && (
                      <tr>
                        <td colSpan="6">No parts in admin catalog yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </section>
          )}
        </>
      )}

      {/* Confirm overlay */}
      {confirmState && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h4>Are you sure?</h4>
            <p>{confirmState.message}</p>
            <div className="confirm-actions">
              <button
                className="confirm-btn confirm-danger"
                onClick={handleConfirm}
              >
                Yes, delete
              </button>
              <button
                className="confirm-btn confirm-cancel"
                onClick={handleCancelConfirm}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminPanel;
