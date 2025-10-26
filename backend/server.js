/**
 * Main server file for the file upload service
 * Sets up Express server with middleware, routes, and error handling
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('../config');
const uploadRoutes = require('./routes/upload');

// Create Express application
const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api', uploadRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'File upload service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint - serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested API endpoint does not exist'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  // Don't leak error details in production
  const isDevelopment = config.server.env === 'development';
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Start server
const PORT = config.server.port;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 File upload service running on port ${PORT}`);
  console.log(`📁 Storage type: ${config.storage.type}`);
  console.log(`🌐 Environment: ${config.server.env}`);
  console.log(`📋 Allowed file types: ${config.upload.allowedTypes.join(', ')}`);
  console.log(`📏 Max file size: ${config.upload.maxFileSize / (1024 * 1024)}MB`);
  
  if (config.server.env === 'development') {
    console.log(`🔗 Access the service at: http://localhost:${PORT}`);
  } else {
    console.log(`🌍 Service is running in production mode`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
