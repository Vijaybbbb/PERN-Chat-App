const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);

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
      filename: `voice_${req.userId}_${Date.now()}.webm`,
      contentType: req.file.mimetype
    });
    formData.append('upload_preset', 'Chat-App');
    formData.append('cloud_name', 'dfozstttc');
    formData.append('resource_type', 'video');
    formData.append('folder', `chat-voice-messages/${chatId}`);

    const result = await observability.measureDependency('cloudinary', 'voice_upload', async () => {
      const response = await fetch('https://api.cloudinary.com/v1_1/dfozstttc/video/upload', {
        method: 'POST',
        body: formData
      });
      const uploadResult = await response.json();
      if (!response.ok) throw new Error(uploadResult.error?.message || 'Upload failed');
      return uploadResult;
    });

    const voiceData = {
      fileName: `voice_message_${Date.now()}.webm`,
      fileUrl: result.secure_url,
      fileType: 'audio/webm',
      fileSize: req.file.size,
      duration: result.duration || 0,
      uploadedBy: req.userId,
      chatId: chatId
    };
    
    observability.recordOperation('voice_upload');
    res.status(200).json({
      success: true,
      voice: voiceData
    });
  } catch (error) {
    observability.recordOperation('voice_upload', 'failure');
    req.log.error('Voice upload failed', { event: 'voice_upload_failed', error });
    res.status(500).json({
      success: false,
      message: 'Voice upload failed',
      requestId: req.requestId
    });
  }
};

module.exports = { upload, uploadVoice };
