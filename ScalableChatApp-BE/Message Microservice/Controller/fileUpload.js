const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

// Configure AWS S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer for S3 upload
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Get chatId from body, params, or query
      const chatId = req.body.chatId || req.params.chatId || req.query.chatId || 'unknown';
      const fileName = `chat-files/${chatId}/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    }
  }),
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
      fileUrl: req.file.location,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.userId,
      chatId: chatId
    };
    
    res.status(200).json({
      success: true,
      file: fileData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { upload, uploadFile };