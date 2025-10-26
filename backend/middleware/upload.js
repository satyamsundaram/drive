/**
 * Multer middleware configuration for file uploads
 * Handles file upload validation, storage, and error handling
 */

const multer = require('multer');
const path = require('path');
const config = require('../../config');
const { 
  generateUniqueFilename, 
  generateFilePath, 
  validateFileType, 
  validateFileSize,
  ensureDirectoryExists 
} = require('../utils/fileUtils');

/**
 * Custom storage engine for Multer
 * Handles file naming and directory structure
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Generate unique filename
      const uniqueFilename = generateUniqueFilename(file.originalname);
      const { dateDir } = generateFilePath(uniqueFilename);
      
      // Ensure directory exists
      await ensureDirectoryExists(dateDir);
      
      // Store filename in request for later use
      req.uniqueFilename = uniqueFilename;
      
      cb(null, dateDir);
    } catch (error) {
      cb(error);
    }
  },
  
  filename: (req, file, cb) => {
    // Use the filename we generated in destination
    cb(null, req.uniqueFilename);
  }
});

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
 * Multer configuration
 * Combines storage, file filter, and limits
 */
const upload = multer({
  storage: storage,
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
  upload,
  handleUploadError,
  validateUploadedFile
};
