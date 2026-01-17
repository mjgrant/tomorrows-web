import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import bcrypt from "bcryptjs";
import "./passport.js";
import User from "./userModel.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_KEY || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ---------- AUTH HELPERS ----------
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// --- BASIC ROUTES ---
app.get("/", (req, res) => {
  res.send("Backend working!");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:3000/",
    failureRedirect: "http://localhost:3000/signin",
  })
);

app.get("/auth/user", (req, res) => {
  if (req.user) {
    return res.json(req.user);
  } else {
    return res.json(null);
  }
});

// --- REGISTRATION ROUTE ---
app.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log("Registration attempt:", { username, email });

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      name: username,
      bio: "",
      location: "",
    });

    await newUser.save();

    console.log("User created successfully:", newUser.email);

    res.json({
      message: "Registration successful",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// --- LOGIN ROUTE ---
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", { email });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    req.login(user, (err) => {
      if (err) {
        console.error("Login session error:", err);
        return res.status(500).json({ error: "Login failed" });
      }

      console.log("User logged in successfully:", user.email);

      res.json({
        message: "Login successful",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
        },
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.put("/auth/profile", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { username, bio, location } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          username: username,
          bio: bio,
          location: location,
        },
      },
      { new: true }
    );

    res.json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Admin Routes

app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json({ users });
  } catch (err) {
    console.error("Error fetching users for admin:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Toggle admin status for a user
app.patch(
  "/api/admin/users/:userId/admin",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { makeAdmin } = req.body;

      const updated = await User.findByIdAndUpdate(
        userId,
        { isAdmin: !!makeAdmin },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: updated });
    } catch (err) {
      console.error("Error updating admin status:", err);
      res.status(500).json({ error: "Failed to update admin status" });
    }
  }
);

// Delete a user (admin only; can't delete self)
app.delete(
  "/api/admin/users/:userId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (req.user.id === userId) {
        return res
          .status(400)
          .json({ error: "You cannot delete your own admin account" });
      }

      const deleted = await User.findByIdAndDelete(userId);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);


// Build Routes 

app.get("/api/build/current", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("currentBuild");
    res.json({ currentBuild: user?.currentBuild || {} });
  } catch (err) {
    console.error("Error fetching current build:", err);
    res.status(500).json({ error: "Failed to fetch current build" });
  }
});

// Overwrite the user's current build
app.put("/api/build/current", requireAuth, async (req, res) => {
  try {
    const { currentBuild } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.currentBuild = currentBuild || {};
    await user.save();

    res.json({ currentBuild: user.currentBuild });
  } catch (err) {
    console.error("Error updating current build:", err);
    res.status(500).json({ error: "Failed to update current build" });
  }
});

// Save the current build as a named build in the user's builds array
app.post("/api/build/save", requireAuth, async (req, res) => {
  try {
    const { name, currentBuild, totalPrice } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const partsToSave =
      currentBuild && Object.keys(currentBuild).length
        ? currentBuild
        : user.currentBuild || {};

    const buildDoc = {
      name: name || "My Build",
      parts: partsToSave,
      totalPrice: totalPrice || 0,
    };

    user.builds.push(buildDoc);
    user.currentBuild = partsToSave;

    await user.save();

    const savedBuild = user.builds[user.builds.length - 1];
    res.json({ build: savedBuild });
  } catch (err) {
    console.error("Error saving build:", err);
    res.status(500).json({ error: "Failed to save build" });
  }
});

// Return all saved builds for the logged-in user
app.get("/api/build/saved", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("builds");
    res.json({ builds: user?.builds || [] });
  } catch (err) {
    console.error("Error fetching saved builds:", err);
    res.status(500).json({ error: "Failed to fetch saved builds" });
  }
});

// Get a single saved build (for "View" button)
app.get("/api/build/saved/:buildId", requireAuth, async (req, res) => {
  try {
    const { buildId } = req.params;
    const user = await User.findById(req.user.id).select("builds");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const build = (user.builds || []).id(buildId);
    if (!build) {
      return res.status(404).json({ error: "Build not found" });
    }

    res.json(build);
  } catch (err) {
    console.error("Error fetching single saved build:", err);
    res.status(500).json({ error: "Failed to fetch build" });
  }
});

// Delete a saved build by id
app.delete("/api/build/saved/:buildId", requireAuth, async (req, res) => {
  try {
    const { buildId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.builds = (user.builds || []).filter(
      (b) => b._id.toString() !== buildId
    );

    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting saved build:", err);
    res.status(500).json({ error: "Failed to delete build" });
  }
});

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err));

app.listen(5000, () => console.log("Server running on port 5000"));
