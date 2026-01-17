import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from './userModel.js';
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google OAuth Profile:", profile.displayName, profile.emails[0].value);
        
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          console.log("Creating new user in database...");
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
            username: profile.displayName.replace(/\s+/g, '').toLowerCase(),
            bio: "",
            location: ""
          });
          console.log("New user created:", user.name);
        } else {
          console.log("Existing user found:", user.name);
        }

        return done(null, user);
      } catch (error) {
        console.error("Error in Google OAuth:", error);
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log("Deserializing user ID:", id);
    const user = await User.findById(id);
    if (!user) {
      console.log("User not found during deserialization");
      return done(null, false);
    }
    console.log("User deserialized:", user.name);
    done(null, user);
  } catch (error) {
    console.error("Error deserializing user:", error);
    done(error, null);
  }
});