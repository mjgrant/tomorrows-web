import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import './passport.js';
import User from './userModel.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(
  session({
    secret: process.env.SESSION_KEY || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- EXISTING ROUTES ---
app.get("/", (req, res) => {
  res.send("Backend working!");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: 'http://localhost:3000/',
    failureRedirect: 'http://localhost:3000/signin',
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

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: "User with this email or username already exists" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      name: username, // Use username as display name
      bio: "",
      location: ""
    });

    await newUser.save();

    console.log("User created successfully:", newUser.email);

    res.json({ 
      message: "Registration successful", 
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name
      }
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

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Log the user in
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
          name: user.name
        }
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
          location: location
        } 
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
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// --- PC PART PICKER SCRAPING ROUTE ---
app.get('/api/real-parts/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log(`🔄 Attempting to scrape PC Part Picker for: ${category}`);
    
    // Map categories to PC Part Picker URLs
    const categoryMap = {
      'cpu': 'https://pcpartpicker.com/products/cpu/',
      'cpu-cooler': 'https://pcpartpicker.com/products/cpu-cooler/',
      'motherboard': 'https://pcpartpicker.com/products/motherboard/',
      'memory': 'https://pcpartpicker.com/products/memory/',
      'storage': 'https://pcpartpicker.com/products/internal-hard-drive/',
      'video-card': 'https://pcpartpicker.com/products/video-card/',
      'case': 'https://pcpartpicker.com/products/case/',
      'power-supply': 'https://pcpartpicker.com/products/power-supply/',
      'operating-system': 'https://pcpartpicker.com/products/os/'
    };

    const url = categoryMap[category];
    if (!url) {
      console.log(`❌ Unknown category: ${category}`);
      const mockParts = generateEnhancedMockData(category);
      return res.json(mockParts);
    }

    // Enhanced headers to mimic a real browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };

    const response = await axios.get(url, { 
      headers,
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`✅ Successfully fetched page, status: ${response.status}`);
    
    const $ = cheerio.load(response.data);
    const parts = [];
    
    // Try multiple selectors for product rows
    const selectors = [
      'tr.tr__product',
      '.tr__product',
      'table tr:not(.tr__header)',
      '.product-row'
    ];
    
    let productRows = null;
    for (const selector of selectors) {
      productRows = $(selector);
      if (productRows.length > 0) {
        console.log(`✅ Found ${productRows.length} products using selector: ${selector}`);
        break;
      }
    }
    
    if (!productRows || productRows.length === 0) {
      console.log('❌ No product rows found with any selector');
      console.log('📋 Using enhanced mock data');
      const mockParts = generateEnhancedMockData(category);
      return res.json(mockParts);
    }

    // Parse each product row
    productRows.each((i, element) => {
      try {
        const $row = $(element);
        
        // Try multiple selectors for name
        const nameSelectors = [
          '.td__name a',
          '.product-name a',
          'a[href*="/product/"]',
          '.td__component a'
        ];
        
        let name = '';
        for (const selector of nameSelectors) {
          name = $row.find(selector).first().text().trim();
          if (name) break;
        }
        
        // Try multiple selectors for price
        const priceSelectors = [
          '.td__price',
          '.price',
          '.product-price',
          '.td__final-price'
        ];
        
        let price = '';
        for (const selector of priceSelectors) {
          price = $row.find(selector).text().trim();
          if (price) break;
        }
        
        if (name && price) {
          const part = {
            id: i + 1,
            name,
            price,
            rating: '4.5',
            brand: name.split(' ')[0],
            image: `https://via.placeholder.com/300x300/374151/FFFFFF?text=${encodeURIComponent(name.substring(0, 20))}`
          };
          
          // Add category-specific specs
          if (category === 'cpu') {
            const specs = [];
            $row.find('.td__spec').each((j, specEl) => {
              specs.push($(specEl).text().trim());
            });
            
            part.coreCount = specs[0] || 'N/A';
            part.clockSpeed = specs[1] || 'N/A';
            part.boostClock = specs[2] || 'N/A';
            part.architecture = specs[3] || 'N/A';
            part.tdp = specs[4] || 'N/A';
            part.graphics = specs[5] || 'N/A';
          }
          
          parts.push(part);
        }
      } catch (rowError) {
        console.log(`⚠️ Error parsing row ${i}:`, rowError.message);
      }
    });

    console.log(`✅ Successfully parsed ${parts.length} parts`);
    
    if (parts.length === 0) {
      console.log('📋 No parts parsed, using enhanced mock data');
      const mockParts = generateEnhancedMockData(category);
      return res.json(mockParts);
    }
    
    res.json(parts.slice(0, 20)); // Return first 20 parts
    
  } catch (error) {
    console.error('❌ Scraping error:', error.message);
    console.log('📋 Using enhanced mock data as fallback');
    const mockParts = generateEnhancedMockData(req.params.category);
    res.json(mockParts);
  }
});

// Enhanced mock data generator
function generateEnhancedMockData(category) {
  const mockData = {
    cpu: [
      { id: 1, name: "AMD Ryzen 7 9800X3D", brand: "AMD", price: "$467.15", coreCount: "8", clockSpeed: "4.7 GHz", boostClock: "5.2 GHz", architecture: "Zen 5", tdp: "120W", graphics: "Radeon", rating: "4.8", image: "https://via.placeholder.com/300x300/374151/FFFFFF?text=AMD+Ryzen+7+9800X3D" },
      { id: 2, name: "AMD Ryzen 7 7800X3D", brand: "AMD", price: "$398.00", coreCount: "8", clockSpeed: "4.2 GHz", boostClock: "5.0 GHz", architecture: "Zen 4", tdp: "120W", graphics: "Radeon", rating: "4.7", image: "https://via.placeholder.com/300x300/374151/FFFFFF?text=AMD+Ryzen+7+7800X3D" },
      { id: 3, name: "AMD Ryzen 5 7600X", brand: "AMD", price: "$179.96", coreCount: "6", clockSpeed: "4.7 GHz", boostClock: "5.3 GHz", architecture: "Zen 4", tdp: "105W", graphics: "Radeon", rating: "4.6", image: "https://via.placeholder.com/300x300/374151/FFFFFF?text=AMD+Ryzen+5+7600X" },
      { id: 4, name: "AMD Ryzen 5 9600X", brand: "AMD", price: "$188.94", coreCount: "6", clockSpeed: "3.9 GHz", boostClock: "5.4 GHz", architecture: "Zen 5", tdp: "65W", graphics: "Radeon", rating: "4.5", image: "https://via.placeholder.com/300x300/374151/FFFFFF?text=AMD+Ryzen+5+9600X" },
      { id: 5, name: "AMD Ryzen 9 9950X3D", brand: "AMD", price: "$679.99", coreCount: "16", clockSpeed: "4.3 GHz", boostClock: "5.7 GHz", architecture: "Zen 5", tdp: "170W", graphics: "Radeon", rating: "4.9", image: "https://via.placeholder.com/300x300/374151/FFFFFF?text=AMD+Ryzen+9+9950X3D" }
    ],
    // ... keep your other mock data categories
  };
  
  return mockData[category] || [
    { id: 1, name: `Sample ${category} 1`, brand: "Generic", price: "$99.99", rating: "4.0", image: "https://via.placeholder.com/300x300/374151/FFFFFF?text=Sample+Part+1" },
    { id: 2, name: `Sample ${category} 2`, brand: "Generic", price: "$149.99", rating: "4.2", image: "https://via.placeholder.com/300x300/374151/FFFFFF?text=Sample+Part+2" }
  ];
}

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.log("❌ MongoDB connection error:", err));

app.listen(5000, () => console.log("🚀 Server running on port 5000"));