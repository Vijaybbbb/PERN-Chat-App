const express = require('express');
const cors = require('cors');
const app = express();
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { connect } = require('./Model/dataBaseConnection');
const { connect: connectCommonDb } = require('../Common Microservice/common_functions/databaseConnection');

dotenv.config()
const PORT = process.env.CHAT_PORT || process.env.PORT || 4001

// Connect to database first
Promise.all([connect(), connectCommonDb()]).then(() => {
    // const userRouter = require('./Router/user')
    const chatRouter = require('./Router/chat')
    //const messageRouter = require('./Router/message')

    //middlewares
    app.use(express.json())
    app.use(cookieParser())
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.use(cors({
           origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173',
           credentials: true
    }))

    app.use('/chat',chatRouter)

    app.use((err,req,res,next)=>{
           const errorStatus  = err.status || 500
           const errorMessage  = err.message || 'Something Went Wrong'

           return res.status(errorStatus).json({
                  success:false,
                  status:errorStatus,
                  message:errorMessage,
                  stack:err.stack
           })
    })

    app.post('/clearCookie', (req, res) => {

           try {
                  res.cookie('access_tocken', '', { expires: new Date(0) });
                  // Send a response
                  res.status(200).json('Cookie cleared');
           } catch (error) {
                  console.log(error);
           }
    });

    app.listen(PORT,()=>{console.log(`CHAT SERVICE RUNNING : ${PORT}`)})
}).catch(err => {
    console.error('Database connection failed:', err);
});







