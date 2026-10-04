const express = require('express')
const { verifyTocken } = require('../../Common Microservice')
const { userRateLimiter, aiRateLimiter } = require('../../Common Microservice/common_functions/rateLimiters')
const { sendMessage, allMessages } = require('../Controller/message')
const { summarizeChat, suggestReplies } = require('../Controller/ai')
const { upload, uploadFile } = require('../Controller/fileUpload')
const { upload: voiceUpload, uploadVoice } = require('../Controller/voiceUpload')
const router = express.Router()

router.post('/', verifyTocken, userRateLimiter, sendMessage)
router.post('/upload/:chatId', verifyTocken, userRateLimiter, upload.single('file'), uploadFile)
router.post('/upload-voice', verifyTocken, userRateLimiter, voiceUpload.single('voice'), uploadVoice)

// Keep these routes above /:chatId so they are never interpreted as a chat id.
router.get('/ai/summary/:chatId', verifyTocken, aiRateLimiter, summarizeChat)
router.get('/ai/smart-replies/:chatId', verifyTocken, aiRateLimiter, suggestReplies)

router.get('/:chatId', verifyTocken, userRateLimiter, allMessages)



 
module.exports = router
