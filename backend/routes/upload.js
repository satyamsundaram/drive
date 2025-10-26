/**
 * Upload routes for file operations
 * Handles file upload, listing, download, and deletion endpoints
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const config = require('../../config');
const { upload, handleUploadError, validateUploadedFile } = require('../middleware/upload');
const { uploadCloud, handleUploadError: handleCloudUploadError, validateUploadedFile: validateCloudUploadedFile } = require('../middleware/uploadCloud');
const storageService = require('../services/storageService');
const {
  generateFilePath,
  generateFileMetadata,
  saveFileMetadata,
  loadFileMetadata,
  deleteFileAndMetadata,
  getAllFileMetadata
} = require('../utils/fileUtils');

const router = express.Router();

/**
 * POST /api/upload
 * Upload a single file
 * 
 * Request: multipart/form-data with 'file' field
 * Response: File metadata including unique ID
 */
router.post('/upload', async (req, res, next) => {
  try {
    // Choose upload middleware based on storage type
    const uploadMiddleware = config.storage.type === 'cloudinary' 
      ? uploadCloud.single('file') 
      : upload.single('file');
    
    const validateMiddleware = config.storage.type === 'cloudinary'
      ? validateCloudUploadedFile
      : validateUploadedFile;
    
    // Apply upload middleware
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        const errorHandler = config.storage.type === 'cloudinary'
          ? handleCloudUploadError
          : handleUploadError;
        return errorHandler(err, req, res, next);
      }
      
      // Apply validation middleware
      validateMiddleware(req, res, async () => {
        try {
          const file = req.file;
          
          // Upload file using storage service
          const metadata = await storageService.uploadFile(file);
          
          // Save metadata to JSON file (for both local and cloud)
          await saveFileMetadata(metadata);
          
          // Return success response with file information
          res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            file: {
              id: metadata.id,
              originalName: metadata.originalName,
              fileName: metadata.fileName,
              mimeType: metadata.mimeType,
              size: metadata.size,
              uploadDate: metadata.uploadDate,
              downloadUrl: storageService.getDownloadUrl(metadata)
            }
          });
          
        } catch (error) {
          console.error('Upload error:', error);
          res.status(500).json({
            success: false,
            error: 'Upload failed',
            message: 'An error occurred while uploading the file'
          });
        }
      });
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: 'An error occurred while uploading the file'
    });
  }
});

/**
 * GET /api/files
 * List all uploaded files with pagination
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * 
 * Response: Array of file metadata
 */
router.get('/files', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get all file metadata
    const allFiles = await getAllFileMetadata();
    
    // Apply pagination
    const totalFiles = allFiles.length;
    const totalPages = Math.ceil(totalFiles / limit);
    const files = allFiles.slice(offset, offset + limit);
    
    // Format response
    const formattedFiles = files.map(file => ({
      id: file.id,
      originalName: file.originalName,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      uploadDate: file.uploadDate,
      downloadUrl: `/api/files/${file.id}`
    }));
    
    res.json({
      success: true,
      files: formattedFiles,
      pagination: {
        page,
        limit,
        totalFiles,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files',
      message: 'An error occurred while retrieving files'
    });
  }
});

/**
 * GET /api/files/:id
 * Download a specific file by ID
 * 
 * Parameters:
 * - id: File ID (UUID)
 * 
 * Response: File stream with appropriate headers or redirect to cloud URL
 */
router.get('/files/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Load file metadata
    const metadata = await loadFileMetadata(fileId);
    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }
    
    // Handle cloud storage files
    if (metadata.storageType === 'cloudinary') {
      // Redirect to cloud URL for cloud storage
      return res.redirect(metadata.url);
    }
    
    // Handle local storage files
    if (metadata.storageType === 'local' || !metadata.storageType) {
      // Handle both old and new metadata formats
      let filePath;
      if (metadata.relativePath) {
        // New format with relativePath
        filePath = path.join(config.upload.uploadDir, metadata.relativePath);
      } else if (metadata.path) {
        // Old format with absolute path
        filePath = metadata.path;
      } else {
        return res.status(500).json({
          success: false,
          error: 'Invalid metadata',
          message: 'File metadata is missing path information'
        });
      }
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'The file exists in metadata but not on disk'
        });
      }
      
      // Set appropriate headers for file download
      res.setHeader('Content-Type', metadata.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
      res.setHeader('Content-Length', metadata.size);
      
      // Stream the file
      const fileStream = require('fs').createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      return res.status(500).json({
        success: false,
        error: 'Unknown storage type',
        message: 'File storage type is not supported'
      });
    }
    
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Download failed',
      message: 'An error occurred while downloading the file'
    });
  }
});

/**
 * DELETE /api/files/:id
 * Delete a specific file by ID
 * 
 * Parameters:
 * - id: File ID (UUID)
 * 
 * Response: Success confirmation
 */
router.delete('/files/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Check if file exists
    const metadata = await loadFileMetadata(fileId);
    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }
    
    // Delete file using storage service
    const fileDeleted = await storageService.deleteFile(metadata);
    
    // Delete metadata file
    const metadataPath = path.join(config.storage.metadataDir, `${fileId}.json`);
    let metadataDeleted = false;
    try {
      await fs.unlink(metadataPath);
      metadataDeleted = true;
    } catch (error) {
      console.error('Error deleting metadata file:', error);
    }
    
    if (fileDeleted && metadataDeleted) {
      res.json({
        success: true,
        message: 'File deleted successfully',
        deletedFile: {
          id: metadata.id,
          originalName: metadata.originalName
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Delete failed',
        message: 'An error occurred while deleting the file'
      });
    }
    
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: 'An error occurred while deleting the file'
    });
  }
});

/**
 * GET /api/files/:id/info
 * Get file metadata without downloading
 * 
 * Parameters:
 * - id: File ID (UUID)
 * 
 * Response: File metadata
 */
router.get('/files/:id/info', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Load file metadata
    const metadata = await loadFileMetadata(fileId);
    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }
    
    // Return metadata without sensitive path information
    res.json({
      success: true,
      file: {
        id: metadata.id,
        originalName: metadata.originalName,
        fileName: metadata.fileName,
        mimeType: metadata.mimeType,
        size: metadata.size,
        uploadDate: metadata.uploadDate,
        downloadUrl: `/api/files/${metadata.id}`
      }
    });
    
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file info',
      message: 'An error occurred while retrieving file information'
    });
  }
});

// Apply error handling middleware
router.use(handleUploadError);

module.exports = router;
