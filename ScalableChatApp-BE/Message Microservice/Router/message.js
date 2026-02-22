const express = require('express')
const { verifyTocken } = require('../../Common Microservice')
const { sendMessage, allMessages } = require('../Controller/message')
const { upload, uploadFile } = require('../Controller/fileUpload')
const { upload: voiceUpload, uploadVoice } = require('../Controller/voiceUpload')
const router = express.Router()

// Health check for message service
router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'message-service', message: 'Use POST / to send messages or GET /:chatId to retrieve messages' });
});

router.post('/', verifyTocken,sendMessage)
router.post('/upload/:chatId', verifyTocken, upload.single('file'), uploadFile)
router.post('/upload-voice', verifyTocken, voiceUpload.single('voice'), uploadVoice)
router.get('/:chatId', verifyTocken,allMessages)



 
module.exports = router