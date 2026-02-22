const express = require('express')
const { verifyTocken } = require('../../Common Microservice')
const { sendMessage, allMessages } = require('../Controller/message')
const { upload, uploadFile } = require('../Controller/fileUpload')
const { upload: voiceUpload, uploadVoice } = require('../Controller/voiceUpload')
const router = express.Router()

router.post('/', verifyTocken,sendMessage)
router.post('/upload/:chatId', verifyTocken, upload.single('file'), uploadFile)
router.post('/upload-voice', verifyTocken, voiceUpload.single('voice'), uploadVoice)
router.get('/:chatId', verifyTocken,allMessages)



 
module.exports = router