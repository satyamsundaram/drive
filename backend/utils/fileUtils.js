/**
 * File utility functions for handling file operations
 * Provides reusable functions for file validation, path generation, and metadata management
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');

/**
 * Generate a unique filename with UUID
 * @param {string} originalName - Original filename
 * @returns {string} - Unique filename with UUID
 */
function generateUniqueFilename(originalName) {
  const extension = path.extname(originalName);
  const uuid = uuidv4();
  return `${uuid}${extension}`;
}

/**
 * Generate file path organized by date
 * @param {string} filename - Generated filename
 * @returns {object} - Object containing full path and date-based directory
 */
function generateFilePath(filename) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const dateDir = path.join(config.upload.uploadDir, year.toString(), month, day);
  const fullPath = path.join(dateDir, filename);
  
  return {
    fullPath,
    dateDir,
    relativePath: path.relative(config.upload.uploadDir, fullPath)
  };
}

/**
 * Validate file type based on MIME type and extension
 * @param {string} mimeType - File MIME type
 * @param {string} originalName - Original filename
 * @returns {boolean} - Whether file type is allowed
 */
function validateFileType(mimeType, originalName) {
  const extension = path.extname(originalName).toLowerCase();
  
  // Check MIME type
  const isMimeTypeAllowed = config.upload.allowedTypes.includes(mimeType);
  
  // Check file extension
  const isExtensionAllowed = config.upload.allowedExtensions.includes(extension);
  
  return isMimeTypeAllowed && isExtensionAllowed;
}

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @returns {boolean} - Whether file size is within limits
 */
function validateFileSize(size) {
  return size <= config.upload.maxFileSize;
}

/**
 * Create directory if it doesn't exist
 * @param {string} dirPath - Directory path to create
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Generate file metadata object
 * @param {object} file - Multer file object
 * @param {string} uniqueFilename - Generated unique filename
 * @param {string} filePath - Full file path
 * @returns {object} - File metadata
 */
function generateFileMetadata(file, uniqueFilename, filePath) {
  return {
    id: path.parse(uniqueFilename).name, // UUID without extension
    originalName: file.originalname,
    fileName: uniqueFilename,
    mimeType: file.mimetype,
    size: file.size,
    uploadDate: new Date().toISOString(),
    path: filePath,
    relativePath: path.relative(config.upload.uploadDir, filePath)
  };
}

/**
 * Save file metadata to JSON file
 * @param {object} metadata - File metadata object
 */
async function saveFileMetadata(metadata) {
  const metadataPath = path.join(config.storage.metadataDir, `${metadata.id}.json`);
  await ensureDirectoryExists(config.storage.metadataDir);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * Load file metadata from JSON file
 * @param {string} fileId - File ID (UUID)
 * @returns {object|null} - File metadata or null if not found
 */
async function loadFileMetadata(fileId) {
  try {
    // If using cloud storage, try to get from Cloudinary first
    if (config.storage.type === 'cloudinary') {
      const cloudMetadata = await getFileMetadataFromCloudinaryById(fileId);
      if (cloudMetadata) {
        return cloudMetadata;
      }
    }
    
    // Fallback to local metadata files
    const metadataPath = path.join(config.storage.metadataDir, `${fileId}.json`);
    const metadataContent = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(metadataContent);
  } catch (error) {
    return null;
  }
}

/**
 * Delete file and its metadata
 * @param {string} fileId - File ID (UUID)
 * @returns {boolean} - Whether deletion was successful
 */
async function deleteFileAndMetadata(fileId) {
  try {
    const metadata = await loadFileMetadata(fileId);
    if (!metadata) {
      return false;
    }

    // Delete the actual file - handle both old and new metadata formats
    let filePath;
    if (metadata.relativePath) {
      // New format with relativePath
      filePath = path.join(config.upload.uploadDir, metadata.relativePath);
    } else if (metadata.path) {
      // Old format with absolute path
      filePath = metadata.path;
    } else {
      console.error('Error deleting file: No path information in metadata');
      return false;
    }

    await fs.unlink(filePath);

    // Delete metadata file
    const metadataPath = path.join(config.storage.metadataDir, `${fileId}.json`);
    await fs.unlink(metadataPath);

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Get all file metadata (for listing files)
 * @returns {array} - Array of file metadata objects
 */
async function getAllFileMetadata() {
  try {
    // If using cloud storage, fetch from Cloudinary
    if (config.storage.type === 'cloudinary') {
      return await getAllFileMetadataFromCloudinary();
    }
    
    // Otherwise, use local metadata files
    await ensureDirectoryExists(config.storage.metadataDir);
    const files = await fs.readdir(config.storage.metadataDir);
    const metadataFiles = files.filter(file => file.endsWith('.json'));
    
    const allMetadata = [];
    for (const file of metadataFiles) {
      try {
        const filePath = path.join(config.storage.metadataDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const metadata = JSON.parse(content);
        allMetadata.push(metadata);
      } catch (error) {
        console.error(`Error reading metadata file ${file}:`, error);
      }
    }
    
    // Sort by upload date (newest first)
    return allMetadata.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  } catch (error) {
    console.error('Error getting all file metadata:', error);
    return [];
  }
}

/**
 * Get all file metadata from Cloudinary
 * @returns {array} - Array of file metadata objects
 */
async function getAllFileMetadataFromCloudinary() {
  try {
    const cloudinary = require('cloudinary').v2;
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: config.storage.cloudinary.cloud_name,
      api_key: config.storage.cloudinary.api_key,
      api_secret: config.storage.cloudinary.api_secret
    });
    
    // Get all resources from the folder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: config.storage.cloudinary.folder,
      max_results: 500, // Adjust as needed
      context: true // Include context data
    });
    
    // Transform Cloudinary resources to our metadata format
    const metadata = result.resources.map(resource => {
      // Extract original filename from context or tags
      let originalName = resource.public_id.split('/').pop(); // fallback
      
      if (resource.context?.custom?.original_filename) {
        originalName = resource.context.custom.original_filename;
      } else if (resource.context?.original_filename) {
        originalName = resource.context.original_filename;
      } else if (resource.original_filename) {
        originalName = resource.original_filename;
      } else if (resource.tags) {
        // Look for original_name tag
        const originalNameTag = resource.tags.find(tag => tag.startsWith('original_name:'));
        if (originalNameTag) {
          originalName = originalNameTag.replace('original_name:', '');
        }
      }
      
      return {
        id: resource.public_id.split('/').pop(), // Extract filename as ID
        originalName: originalName,
        fileName: resource.public_id.split('/').pop(),
        mimeType: resource.resource_type === 'image' ? `image/${resource.format}` : resource.resource_type,
        size: resource.bytes,
        uploadDate: resource.created_at,
        url: resource.secure_url,
        publicId: resource.public_id,
        format: resource.format,
        width: resource.width,
        height: resource.height,
        storageType: 'cloudinary' // Add storage type for consistency
      };
    });
    
    // Sort by upload date (newest first)
    return metadata.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  } catch (error) {
    console.error('Error getting file metadata from Cloudinary:', error);
    return [];
  }
}

/**
 * Get file metadata by ID from Cloudinary
 * @param {string} fileId - File ID
 * @returns {object|null} - File metadata or null if not found
 */
async function getFileMetadataFromCloudinaryById(fileId) {
  try {
    const cloudinary = require('cloudinary').v2;
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: config.storage.cloudinary.cloud_name,
      api_key: config.storage.cloudinary.api_key,
      api_secret: config.storage.cloudinary.api_secret
    });
    
    // Get all resources from the folder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: config.storage.cloudinary.folder,
      max_results: 500,
      context: true // Include context data
    });
    
    // Find the resource with matching ID
    const resource = result.resources.find(r => r.public_id.split('/').pop() === fileId);
    
    if (!resource) {
      return null;
    }
    
    // Extract original filename from context or tags
    let originalName = resource.public_id.split('/').pop(); // fallback
    
    if (resource.context?.custom?.original_filename) {
      originalName = resource.context.custom.original_filename;
    } else if (resource.context?.original_filename) {
      originalName = resource.context.original_filename;
    } else if (resource.original_filename) {
      originalName = resource.original_filename;
    } else if (resource.tags) {
      // Look for original_name tag
      const originalNameTag = resource.tags.find(tag => tag.startsWith('original_name:'));
      if (originalNameTag) {
        originalName = originalNameTag.replace('original_name:', '');
      }
    }
    
    // Transform to our metadata format
    return {
      id: resource.public_id.split('/').pop(),
      originalName: originalName,
      fileName: resource.public_id.split('/').pop(),
      mimeType: resource.resource_type === 'image' ? `image/${resource.format}` : resource.resource_type,
      size: resource.bytes,
      uploadDate: resource.created_at,
      url: resource.secure_url,
      publicId: resource.public_id,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      storageType: 'cloudinary'
    };
  } catch (error) {
    console.error('Error getting file metadata from Cloudinary by ID:', error);
    return null;
  }
}

module.exports = {
  generateUniqueFilename,
  generateFilePath,
  validateFileType,
  validateFileSize,
  ensureDirectoryExists,
  generateFileMetadata,
  saveFileMetadata,
  loadFileMetadata,
  deleteFileAndMetadata,
  getAllFileMetadata,
  getFileMetadataFromCloudinaryById
};
