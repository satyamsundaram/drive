/**
 * Client-side JavaScript for file upload service
 * Handles file uploads, progress tracking, and file management
 */

class FileUploadService {
    constructor() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.statusMessage = document.getElementById('statusMessage');
        this.filesContainer = document.getElementById('filesContainer');
        this.loadingFiles = document.getElementById('loadingFiles');
        
        this.initializeEventListeners();
        this.loadFiles();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });

        this.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // Click to upload
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });

        // Browse button click
        const browseBtn = document.getElementById('browseBtn');
        if (browseBtn) {
            browseBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering upload area click
                this.fileInput.click();
            });
        }

        // Refresh button click
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadFiles();
            });
        }

        // Close modal button
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Event delegation for file action buttons
        this.filesContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.action-btn');
            if (!button) return;

            const action = button.dataset.action;
            const fileId = button.dataset.fileId;
            const fileName = button.dataset.fileName;

            switch (action) {
                case 'info':
                    this.showFileInfo(fileId);
                    break;
                case 'download':
                    this.downloadFile(fileId, fileName);
                    break;
                case 'delete':
                    this.deleteFile(fileId);
                    break;
            }
        });
    }

    /**
     * Handle file selection and validation
     * @param {File} file - Selected file
     */
    handleFileSelect(file) {
        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showStatus('File size must be less than 10MB', 'error');
            return;
        }

        // Validate file type
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf', 'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedTypes.includes(file.type)) {
            this.showStatus('File type not supported. Please select an image, PDF, document, or text file.', 'error');
            return;
        }

        // Upload the file
        this.uploadFile(file);
    }

    /**
     * Upload file with progress tracking
     * @param {File} file - File to upload
     */
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Show progress container
            this.progressContainer.style.display = 'block';
            this.hideStatus();

            // Create XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();

            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.updateProgress(percentComplete);
                }
            });

            // Handle upload completion
            xhr.addEventListener('load', () => {
                if (xhr.status === 201) {
                    const response = JSON.parse(xhr.responseText);
                    this.showStatus('File uploaded successfully!', 'success');
                    this.updateProgress(100);
                    this.loadFiles(); // Refresh file list
                    
                    // Reset form after successful upload
                    setTimeout(() => {
                        this.resetUploadForm();
                    }, 2000);
                } else {
                    const error = JSON.parse(xhr.responseText);
                    this.showStatus(error.message || 'Upload failed', 'error');
                }
            });

            // Handle upload errors
            xhr.addEventListener('error', () => {
                this.showStatus('Upload failed. Please try again.', 'error');
            });

            // Start upload
            xhr.open('POST', '/api/upload');
            xhr.send(formData);

        } catch (error) {
            console.error('Upload error:', error);
            this.showStatus('Upload failed. Please try again.', 'error');
        }
    }

    /**
     * Update progress bar
     * @param {number} percent - Progress percentage
     */
    updateProgress(percent) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = `${Math.round(percent)}%`;
    }

    /**
     * Show status message
     * @param {string} message - Status message
     * @param {string} type - Message type (success/error)
     */
    showStatus(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
    }

    /**
     * Hide status message
     */
    hideStatus() {
        this.statusMessage.style.display = 'none';
    }

    /**
     * Reset upload form
     */
    resetUploadForm() {
        this.fileInput.value = '';
        this.progressContainer.style.display = 'none';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = '0%';
        this.hideStatus();
    }

    /**
     * Load and display all uploaded files
     */
    async loadFiles() {
        try {
            this.loadingFiles.style.display = 'block';
            this.filesContainer.innerHTML = '';

            const response = await fetch('/api/files');
            const data = await response.json();

            if (data.success) {
                this.displayFiles(data.files);
            } else {
                this.showFilesError('Failed to load files');
            }
        } catch (error) {
            console.error('Error loading files:', error);
            this.showFilesError('Failed to load files');
        } finally {
            this.loadingFiles.style.display = 'none';
        }
    }

    /**
     * Display files in the UI
     * @param {Array} files - Array of file objects
     */
    displayFiles(files) {
        if (files.length === 0) {
            this.filesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <h3>No files uploaded yet</h3>
                    <p>Upload your first file to get started!</p>
                </div>
            `;
            return;
        }

        const filesHTML = files.map(file => this.createFileItem(file)).join('');
        this.filesContainer.innerHTML = filesHTML;
    }

    /**
     * Create HTML for a file item
     * @param {Object} file - File object
     * @returns {string} - HTML string
     */
    createFileItem(file) {
        const fileIcon = this.getFileIcon(file.mimeType);
        const fileSize = this.formatFileSize(file.size);
        const uploadDate = new Date(file.uploadDate).toLocaleDateString();

        return `
            <div class="file-item">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-info">
                    <div class="file-name">${file.originalName}</div>
                    <div class="file-details">
                        ${fileSize} • ${uploadDate} • ${file.mimeType}
                    </div>
                </div>
                <div class="file-actions">
                    <button class="action-btn info-btn" data-action="info" data-file-id="${file.id}">
                        ℹ️ Info
                    </button>
                    <button class="action-btn download-btn" data-action="download" data-file-id="${file.id}" data-file-name="${file.originalName}">
                        ⬇️ Download
                    </button>
                    <button class="action-btn delete-btn" data-action="delete" data-file-id="${file.id}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get appropriate icon for file type
     * @param {string} mimeType - File MIME type
     * @returns {string} - Icon emoji
     */
    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType.includes('word')) return '📝';
        if (mimeType === 'text/plain') return '📄';
        return '📁';
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Show files error message
     * @param {string} message - Error message
     */
    showFilesError(message) {
        this.filesContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Download a file
     * @param {string} fileId - File ID
     * @param {string} fileName - Original file name
     */
    downloadFile(fileId, fileName) {
        const link = document.createElement('a');
        link.href = `/api/files/${fileId}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Delete a file
     * @param {string} fileId - File ID
     */
    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file?')) {
            return;
        }

        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                this.showStatus('File deleted successfully', 'success');
                this.loadFiles(); // Refresh file list
            } else {
                this.showStatus(data.message || 'Failed to delete file', 'error');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            this.showStatus('Failed to delete file', 'error');
        }
    }

    /**
     * Show file information modal
     * @param {string} fileId - File ID
     */
    async showFileInfo(fileId) {
        try {
            const response = await fetch(`/api/files/${fileId}/info`);
            const data = await response.json();

            if (data.success) {
                this.displayFileModal(data.file);
            } else {
                this.showStatus(data.message || 'Failed to get file info', 'error');
            }
        } catch (error) {
            console.error('Error getting file info:', error);
            this.showStatus('Failed to get file info', 'error');
        }
    }

    /**
     * Display file information in modal
     * @param {Object} file - File object
     */
    displayFileModal(file) {
        const modal = document.getElementById('fileModal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <div class="file-detail-item">
                <span class="file-detail-label">Original Name:</span>
                <span class="file-detail-value">${file.originalName}</span>
            </div>
            <div class="file-detail-item">
                <span class="file-detail-label">File ID:</span>
                <span class="file-detail-value">${file.id}</span>
            </div>
            <div class="file-detail-item">
                <span class="file-detail-label">MIME Type:</span>
                <span class="file-detail-value">${file.mimeType}</span>
            </div>
            <div class="file-detail-item">
                <span class="file-detail-label">Size:</span>
                <span class="file-detail-value">${this.formatFileSize(file.size)}</span>
            </div>
            <div class="file-detail-item">
                <span class="file-detail-label">Upload Date:</span>
                <span class="file-detail-value">${new Date(file.uploadDate).toLocaleString()}</span>
            </div>
        `;

        modal.style.display = 'flex';
    }

    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('fileModal').style.display = 'none';
    }
}

// Initialize the file upload service when DOM is loaded
let fileService;
document.addEventListener('DOMContentLoaded', () => {
    fileService = new FileUploadService();
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('fileModal');
    if (e.target === modal && fileService) {
        fileService.closeModal();
    }
});
