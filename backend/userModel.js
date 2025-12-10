import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String,
  avatar: String,
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  password: String, // Add password field
  bio: {
    type: String,
    default: ""
  },
  location: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);