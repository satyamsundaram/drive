/**
 * Storage service for handling file operations
 * Supports both local and cloud storage (Cloudinary)
 */

const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');

// Configure Cloudinary if cloud storage is enabled
if (config.storage.type === 'cloudinary') {
  cloudinary.config({
    cloud_name: config.storage.cloudinary.cloud_name,
    api_key: config.storage.cloudinary.api_key,
    api_secret: config.storage.cloudinary.api_secret
  });
}

class StorageService {
  constructor() {
    this.storageType = config.storage.type;
  }

  /**
   * Upload file to storage
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} - File metadata
   */
  async uploadFile(file) {
    if (this.storageType === 'cloudinary') {
      return this.uploadToCloudinary(file);
    } else {
      return this.uploadToLocal(file);
    }
  }

  /**
   * Upload file to Cloudinary
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} - File metadata
   */
  async uploadToCloudinary(file) {
    try {
      const uniqueId = uuidv4();
      const publicId = `${config.storage.cloudinary.folder}/${uniqueId}`;

      const result = await cloudinary.uploader.upload(file.buffer, {
        public_id: publicId,
        resource_type: 'auto', // Automatically detect file type
        folder: config.storage.cloudinary.folder,
        use_filename: false,
        unique_filename: true
      });

      return {
        id: uniqueId,
        originalName: file.originalname,
        fileName: result.public_id,
        mimeType: file.mimetype,
        size: file.size,
        uploadDate: new Date().toISOString(),
        url: result.secure_url,
        publicId: result.public_id,
        storageType: 'cloudinary'
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload file to cloud storage');
    }
  }

  /**
   * Upload file to local storage (existing logic)
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} - File metadata
   */
  async uploadToLocal(file) {
    // This will be handled by the existing multer middleware
    // We just need to return the metadata
    const uniqueId = uuidv4();
    const extension = require('path').extname(file.originalname);
    const path = require('path');
    
    // Generate relative path for consistency
    const relativePath = path.relative(config.upload.uploadDir, file.path);
    
    return {
      id: uniqueId,
      originalName: file.originalname,
      fileName: `${uniqueId}${extension}`,
      mimeType: file.mimetype,
      size: file.size,
      uploadDate: new Date().toISOString(),
      path: file.path,
      relativePath: relativePath,
      storageType: 'local'
    };
  }

  /**
   * Delete file from storage
   * @param {Object} metadata - File metadata
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(metadata) {
    if (metadata.storageType === 'cloudinary') {
      return this.deleteFromCloudinary(metadata);
    } else {
      return this.deleteFromLocal(metadata);
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {Object} metadata - File metadata
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFromCloudinary(metadata) {
    try {
      await cloudinary.uploader.destroy(metadata.publicId);
      return true;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }

  /**
   * Delete file from local storage
   * @param {Object} metadata - File metadata
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFromLocal(metadata) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Handle both old and new metadata formats
      let filePath;
      if (metadata.relativePath) {
        // New format with relativePath
        filePath = path.join(config.upload.uploadDir, metadata.relativePath);
      } else if (metadata.path) {
        // Old format with absolute path
        filePath = metadata.path;
      } else {
        console.error('Local delete error: No path information in metadata');
        return false;
      }
      
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Local delete error:', error);
      return false;
    }
  }

  /**
   * Get file download URL
   * @param {Object} metadata - File metadata
   * @returns {string} - Download URL
   */
  getDownloadUrl(metadata) {
    if (metadata.storageType === 'cloudinary') {
      return metadata.url;
    } else {
      return `/api/files/${metadata.id}`;
    }
  }

  /**
   * Get file stream for local files
   * @param {Object} metadata - File metadata
   * @returns {ReadableStream} - File stream
   */
  getFileStream(metadata) {
    if (metadata.storageType === 'local') {
      const fs = require('fs');
      return fs.createReadStream(metadata.path);
    }
    return null;
  }
}

module.exports = new StorageService();
