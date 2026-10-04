const express = require('express')
const { verifyTocken } = require('../../Common Microservice/index')
const { userRateLimiter } = require('../../Common Microservice/common_functions/rateLimiters')
const { accessChat, fetchChat, createGroup, renameGroup, addToGroup, removeFromGroup } = require('../Controller/chat')
const router = express.Router()


router.post('/:userId', verifyTocken, userRateLimiter, accessChat)

router.get('/api/fetchChats', verifyTocken, userRateLimiter, fetchChat)
 
router.post('/create/group', verifyTocken, userRateLimiter, createGroup)

router.put('/api/rename', verifyTocken, userRateLimiter, renameGroup)

router.put('/addToGroup', verifyTocken, userRateLimiter, addToGroup)

router.put('/removeGroup', verifyTocken, userRateLimiter, removeFromGroup)


 
module.exports = router
