const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const fs = require('fs');
const path = require('path');
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;

const hasS3Config = Boolean(
  process.env.S3_BUCKET_NAME &&
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

let storage;

if (hasS3Config) {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  storage = multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
      const chatId = req.body.chatId || req.params.chatId || req.query.chatId || 'unknown';
      cb(null, `chat-files/${chatId}/${Date.now()}-${file.originalname}`);
    }
  });
} else {
  const localUploadDir = path.resolve(__dirname, '../uploads');
  fs.mkdirSync(localUploadDir, { recursive: true });
  logger.warn('S3 is not configured; using local attachment storage', {
    event: 's3_storage_disabled'
  });

  storage = multer.diskStorage({
    destination: localUploadDir,
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    }
  });
}

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images, documents, and common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|mov|avi/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const uploadFile = async (req, res) => {
  try {
    const chatId = req.params.chatId || req.body.chatId;
    if (!chatId) {
      return res.status(400).json({ success: false, message: 'Chat ID is required' });
    }
    
    const fileData = {
      fileName: req.file.originalname,
      fileUrl: req.file.location || `${process.env.MESSAGE_PUBLIC_URL || 'http://localhost:3004'}/uploads/${encodeURIComponent(req.file.filename)}`,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.userId,
      chatId: chatId
    };
    
    observability.recordOperation('file_upload');
    res.status(200).json({
      success: true,
      file: fileData
    });
  } catch (error) {
    observability.recordOperation('file_upload', 'failure');
    req.log.error('File upload failed', { event: 'file_upload_failed', error });
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      requestId: req.requestId
    });
  }
};

module.exports = { upload, uploadFile };
