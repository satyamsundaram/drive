#!/usr/bin/env node

/**
 * Test script for cloud storage integration
 * Run this to verify Cloudinary setup before deployment
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testCloudinary() {
  console.log('🧪 Testing Cloudinary Integration...\n');

  // Check if credentials are set
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.log('❌ Cloudinary credentials not found in environment variables');
    console.log('Please set:');
    console.log('- CLOUDINARY_CLOUD_NAME');
    console.log('- CLOUDINARY_API_KEY');
    console.log('- CLOUDINARY_API_SECRET');
    return;
  }

  try {
    // Test 1: Verify credentials
    console.log('1. Testing credentials...');
    const result = await cloudinary.api.ping();
    console.log('✅ Credentials are valid');

    // Test 2: Upload a test file
    console.log('\n2. Testing file upload...');
    
    // Create a simple test file
    const testContent = 'This is a test file for Cloudinary integration';
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, testContent);

    const uploadResult = await cloudinary.uploader.upload(testFilePath, {
      public_id: `test-${Date.now()}`,
      folder: process.env.CLOUDINARY_FOLDER || 'file-upload-service',
      resource_type: 'auto'
    });

    console.log('✅ File uploaded successfully');
    console.log(`   URL: ${uploadResult.secure_url}`);
    console.log(`   Public ID: ${uploadResult.public_id}`);

    // Test 3: Delete the test file
    console.log('\n3. Testing file deletion...');
    await cloudinary.uploader.destroy(uploadResult.public_id);
    console.log('✅ File deleted successfully');

    // Clean up local test file
    fs.unlinkSync(testFilePath);

    console.log('\n🎉 All tests passed! Cloudinary integration is working correctly.');
    console.log('\nYou can now deploy to production with confidence!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    
    if (error.message.includes('Invalid cloud name')) {
      console.log('\n💡 Check your CLOUDINARY_CLOUD_NAME');
    } else if (error.message.includes('Invalid API key')) {
      console.log('\n💡 Check your CLOUDINARY_API_KEY');
    } else if (error.message.includes('Invalid API secret')) {
      console.log('\n💡 Check your CLOUDINARY_API_SECRET');
    }
  }
}

// Run the test
testCloudinary();
