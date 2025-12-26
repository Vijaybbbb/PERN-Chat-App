const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for voice messages
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /audio\/webm|audio\/wav|audio\/mp3|audio\/ogg/;
    if (allowedTypes.test(file.mimetype)) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'));
    }
  }
});

const uploadVoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file provided' });
    }

    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ success: false, message: 'Chat ID is required' });
    }

    // Upload to Cloudinary using same URL as frontend
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: `voice_${req.user}_${Date.now()}.webm`,
      contentType: req.file.mimetype
    });
    formData.append('upload_preset', 'Chat-App');
    formData.append('cloud_name', 'dfozstttc');
    formData.append('resource_type', 'video');
    formData.append('folder', `chat-voice-messages/${chatId}`);

    const response = await fetch('https://api.cloudinary.com/v1_1/dfozstttc/video/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Upload failed');
    }

    const voiceData = {
      fileName: `voice_message_${Date.now()}.webm`,
      fileUrl: result.secure_url,
      fileType: 'audio/webm',
      fileSize: req.file.size,
      duration: result.duration || 0,
      uploadedBy: req.user,
      chatId: chatId
    };
    
    res.status(200).json({
      success: true,
      voice: voiceData
    });
  } catch (error) {
    console.error('Voice upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { upload, uploadVoice };