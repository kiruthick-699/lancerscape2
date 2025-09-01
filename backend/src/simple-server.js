require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
let allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);

// Dev fallback if not provided via env
if (allowedOrigins.length === 0) {
  allowedOrigins = [
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:19006'
  ];
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Simple in-memory user storage (for testing)
const users = [];
const tokens = [];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development'
  });
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password, firstName, lastName, userType } = req.body;
    
    // Check if user already exists
    if (users.find(u => u.email === email || u.username === username)) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = {
      id: Date.now().toString(),
      email,
      username,
      password: hashedPassword,
      firstName,
      lastName,
      userType,
      emailVerified: true,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    users.push(user);
    
    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      'your-secret-key',
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      'your-secret-key',
      { expiresIn: '7d' }
    );
    
    const tokenData = {
      accessToken,
      refreshToken,
      expiresIn: 900
    };
    
    tokens.push({
      userId: user.id,
      refreshToken
    });
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        tokens: tokenData
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate new tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      'your-secret-key',
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      'your-secret-key',
      { expiresIn: '7d' }
    );
    
    const tokenData = {
      accessToken,
      refreshToken,
      expiresIn: 900
    };
    
    // Update refresh token
    const tokenIndex = tokens.findIndex(t => t.userId === user.id);
    if (tokenIndex >= 0) {
      tokens[tokenIndex].refreshToken = refreshToken;
    } else {
      tokens.push({
        userId: user.id,
        refreshToken
      });
    }
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    res.json({
      success: true,
      data: {
        user: userResponse,
        tokens: tokenData
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Refresh token endpoint
app.post('/api/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, 'your-secret-key');
    const tokenRecord = tokens.find(t => t.userId === decoded.userId);
    
    if (!tokenRecord || tokenRecord.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Find user
    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate new tokens
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email },
      'your-secret-key',
      { expiresIn: '15m' }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: user.id },
      'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Update refresh token
    tokenRecord.refreshToken = newRefreshToken;
    
    const tokenData = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900
    };
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    res.json({
      success: true,
      data: {
        user: userResponse,
        tokens: tokenData
      }
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Lancerscape2 Simple API is running',
    version: '1.0.0',
    environment: 'development'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: /api/auth/register, /api/auth/login, /api/auth/refresh`);
});
