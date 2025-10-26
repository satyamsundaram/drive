#!/usr/bin/env node

/**
 * Setup script for file upload service
 * Helps configure the application for different environments
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('🚀 File Upload Service Setup\n');
  
  const env = {
    NODE_ENV: 'development',
    PORT: '3000',
    MAX_FILE_SIZE: '10485760',
    UPLOAD_DIR: './uploads',
    ALLOWED_FILE_TYPES: 'image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    STORAGE_TYPE: 'local',
    CORS_ORIGIN: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:3000'
  };

  // Ask for storage type
  const storageType = await question('Storage type (local/cloudinary) [local]: ');
  env.STORAGE_TYPE = storageType || 'local';

  if (env.STORAGE_TYPE === 'cloudinary') {
    console.log('\n📁 Cloudinary Configuration:');
    env.CLOUDINARY_CLOUD_NAME = await question('Cloudinary Cloud Name: ');
    env.CLOUDINARY_API_KEY = await question('Cloudinary API Key: ');
    env.CLOUDINARY_API_SECRET = await question('Cloudinary API Secret: ');
    
    const folder = await question('Cloudinary Folder [file-upload-service]: ');
    env.CLOUDINARY_FOLDER = folder || 'file-upload-service';
  }

  // Ask for environment
  const nodeEnv = await question('Environment (development/production) [development]: ');
  env.NODE_ENV = nodeEnv || 'development';

  if (env.NODE_ENV === 'production') {
    const frontendUrl = await question('Frontend URL (e.g., https://your-app.railway.app): ');
    if (frontendUrl) {
      env.FRONTEND_URL = frontendUrl;
      env.CORS_ORIGIN = frontendUrl;
    }
  }

  // Create .env file
  const envContent = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync('.env', envContent);
  console.log('\n✅ .env file created successfully!');

  // Create uploads directory if using local storage
  if (env.STORAGE_TYPE === 'local') {
    const uploadsDir = path.join(__dirname, 'uploads');
    const metadataDir = path.join(uploadsDir, 'metadata');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Created uploads directory');
    }
    
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
      console.log('📁 Created metadata directory');
    }
  }

  console.log('\n🎉 Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run dev');
  console.log('2. Open: http://localhost:3000');
  
  if (env.STORAGE_TYPE === 'cloudinary') {
    console.log('3. Test file upload to verify Cloudinary integration');
  }
  
  if (env.NODE_ENV === 'production') {
    console.log('3. Deploy to Railway/Render using the deployment guide');
  }

  rl.close();
}

setup().catch(console.error);
