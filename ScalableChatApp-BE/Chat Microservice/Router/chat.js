const express = require('express')
const { verifyTocken } = require('../../Common Microservice/index')
const { accessChat, fetchChat, createGroup, renameGroup, addToGroup, removeFromGroup } = require('../Controller/chat')
const router = express.Router()


router.post('/:userId', verifyTocken, accessChat)

router.get('/api/fetchChats',verifyTocken, fetchChat)
 
router.post('/create/group',verifyTocken, createGroup)

router.put('/api/rename', renameGroup)

router.put('/addToGroup', verifyTocken, addToGroup)

router.put('/removeGroup', verifyTocken, removeFromGroup)


 
module.exports = router