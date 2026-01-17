// userModel.js
import mongoose from "mongoose";

const buildSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    parts: { type: mongoose.Schema.Types.Mixed, default: {} },
    totalPrice: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    googleId: String,
    name: String,
    email: String,
    avatar: String,
    username: {
      type: String,
      unique: true,
      sparse: true
    },
    password: String,
    bio: {
      type: String,
      default: ""
    },
    location: {
      type: String,
      default: ""
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    currentBuild: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    builds: {
      type: [buildSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("User", userSchema);
