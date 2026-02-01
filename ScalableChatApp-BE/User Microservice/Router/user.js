const express = require('express')
const { register, login, allUsers, refreshToken, logout } = require('../Controller/user')
const { verifyTocken } = require('../../Common Microservice')
const router = express.Router()


router.post('/register',register)

router.post('/login',login)

router.post('/refresh-token', refreshToken)

router.post('/logout', verifyTocken, logout)

router.get('/allUsers',verifyTocken,allUsers)




module.exports = router