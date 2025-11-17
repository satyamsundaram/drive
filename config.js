/**
 * Configuration file for the file upload service
 * Centralizes all configuration settings for easy management
 */

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf,text/plain').split(','),
    
    // File type validation
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', '.docx'],
    
    // Security settings
    maxFiles: 1, // Single file upload for MVP
    preserveExtension: true
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000'),
    credentials: true
  },

  // File storage configuration
  storage: {
    // Storage type: 'local' or 'cloudinary'
    type: process.env.STORAGE_TYPE || 'local',
    
    // Local storage settings
    metadataDir: './uploads/metadata',
    organizeByDate: true,
    dateFormat: 'YYYY/MM/DD',
    
    // Cloudinary settings
    cloudinary: {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      folder: process.env.CLOUDINARY_FOLDER || 'file-upload-service'
    }
  }
};
