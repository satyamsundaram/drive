# File Upload Service

A simple, secure file upload service built with Node.js, Express, and vanilla JavaScript. This service provides a clean interface for uploading, managing, and downloading files with progress tracking and file validation.

## Features

- **Single File Upload**: Drag-and-drop or click to upload files
- **File Validation**: Type and size validation for security
- **Progress Tracking**: Real-time upload progress with visual feedback
- **File Management**: List, download, and delete uploaded files
- **Responsive Design**: Works on desktop and mobile devices
- **Secure Storage**: Organized file storage with unique naming

## Supported File Types

- Images: JPEG, PNG, GIF
- Documents: PDF, DOC, DOCX
- Text: TXT files
- Maximum file size: 10MB

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd drive
```

2. Install dependencies:
```bash
npm install
```

3. Run setup (optional but recommended):
```bash
npm run setup
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

## 🚀 Production Deployment

This service is designed to be deployed to production for real-world use. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options:
- **Railway** (Recommended): Free, easy, automatic deployments
- **Render**: Alternative free hosting platform
- **Vercel**: Serverless deployment option

### Why Deploy?
- **Access from anywhere**: Use from your phone, laptop, any device
- **Bypass restrictions**: Works on company networks that block drive services
- **Share with others**: Send files to colleagues easily
- **Always available**: 24/7 access to your files

## Project Structure

```
drive/
├── backend/
│   ├── server.js          # Main server file
│   ├── routes/
│   │   └── upload.js      # Upload API endpoints
│   ├── middleware/
│   │   └── upload.js      # Multer configuration
│   ├── utils/
│   │   └── fileUtils.js   # File handling utilities
│   └── uploads/           # File storage directory
├── frontend/
│   ├── index.html         # Main upload interface
│   ├── styles.css         # Styling
│   └── script.js          # Client-side logic
├── config.js              # Configuration settings
├── package.json           # Dependencies
└── README.md             # This file
```

## API Endpoints

### Upload File
- **POST** `/api/upload`
- Upload a single file
- Content-Type: `multipart/form-data`
- Field name: `file`

### List Files
- **GET** `/api/files`
- Query parameters: `page`, `limit`
- Returns paginated list of files

### Download File
- **GET** `/api/files/:id`
- Download file by ID

### Delete File
- **DELETE** `/api/files/:id`
- Delete file by ID

### File Info
- **GET** `/api/files/:id/info`
- Get file metadata without downloading

## Configuration

Edit `config.js` to customize:

- File size limits
- Allowed file types
- Upload directory
- Server port
- CORS settings

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

### File Storage

Files are organized by date in the following structure:
```
uploads/
├── 2024/
│   ├── 01/
│   │   ├── 15/
│   │   │   └── uuid-filename.ext
│   │   └── 16/
└── metadata/
    └── uuid.json
```

## Security Features

- File type validation (MIME type + extension)
- File size limits
- Path traversal protection
- CORS configuration
- Input sanitization

## Future Enhancements

- Multiple file upload
- Resume interrupted uploads
- Image processing and thumbnails
- User authentication
- Cloud storage integration
- File sharing with public links

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
