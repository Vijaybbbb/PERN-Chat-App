const express = require('express')
const { register, login, allUsers } = require('../Controller/user')
const { verifyTocken } = require('../../Common Microservice')
const router = express.Router()


router.post('/register',register)

router.post('/login',login)

router.get('/allUsers',verifyTocken,allUsers)




module.exports = router