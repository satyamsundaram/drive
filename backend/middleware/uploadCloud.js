/**
 * Multer middleware configuration for cloud storage
 * Handles file uploads to Cloudinary when cloud storage is enabled
 */

const multer = require('multer');
const config = require('../../config');
const { validateFileType, validateFileSize } = require('../utils/fileUtils');

/**
 * Memory storage for cloud uploads (Cloudinary)
 * Files are stored in memory and then uploaded to cloud
 */
const memoryStorage = multer.memoryStorage();

/**
 * File filter function for validation
 * Validates file type and size before processing
 */
const fileFilter = (req, file, cb) => {
  try {
    // Validate file type
    if (!validateFileType(file.mimetype, file.originalname)) {
      const error = new Error('Invalid file type. Allowed types: ' + config.upload.allowedTypes.join(', '));
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    
    // File type is valid
    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

/**
 * Multer configuration for cloud storage
 * Uses memory storage for Cloudinary uploads
 */
const uploadCloud = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles
  }
});

/**
 * Error handling middleware for Multer errors
 * Converts Multer errors to user-friendly messages
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File too large',
          message: `File size must be less than ${config.upload.maxFileSize / (1024 * 1024)}MB`
        });
      
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files',
          message: 'Only one file can be uploaded at a time'
        });
      
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field',
          message: 'Please use the correct field name for file upload'
        });
      
      default:
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: error.message
        });
    }
  }
  
  // Handle custom validation errors
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: error.message
    });
  }
  
  // Pass other errors to the next error handler
  next(error);
};

/**
 * Middleware to validate file after upload
 * Additional validation that can't be done in Multer
 */
const validateUploadedFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
      message: 'Please select a file to upload'
    });
  }
  
  // Additional file size validation (redundant but safe)
  if (!validateFileSize(req.file.size)) {
    return res.status(400).json({
      success: false,
      error: 'File too large',
      message: `File size must be less than ${config.upload.maxFileSize / (1024 * 1024)}MB`
    });
  }
  
  next();
};

module.exports = {
  uploadCloud,
  handleUploadError,
  validateUploadedFile
};
