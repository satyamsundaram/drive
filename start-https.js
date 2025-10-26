/**
 * HTTPS version of the server for companies with strict security policies
 * This creates a self-signed certificate for local development
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const app = require('./backend/server');

// Create self-signed certificate for development
const selfsigned = require('selfsigned');
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

const options = {
  key: pems.private,
  cert: pems.cert
};

// Start HTTPS server
const PORT = 3443; // Different port for HTTPS
const server = https.createServer(options, app);

server.listen(PORT, () => {
  console.log(`🔒 HTTPS File upload service running on port ${PORT}`);
  console.log(`🌐 Access the service at: https://localhost:${PORT}`);
  console.log(`⚠️  You may need to accept the self-signed certificate in your browser`);
  console.log(`📁 Upload directory: ./uploads`);
  console.log(`🌐 Environment: development`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTPS Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('HTTPS Server closed');
    process.exit(0);
  });
});
