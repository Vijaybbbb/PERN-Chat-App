import { ArrowBackIcon, AttachmentIcon } from '@chakra-ui/icons'
import { Box, FormControl, IconButton, Input, Spinner, Text, useToast, InputGroup, InputRightElement } from '@chakra-ui/react'
import React, { useEffect, useState, useRef } from 'react'
import VoiceRecorder from '../VoiceRecorder/VoiceRecorder'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedChat } from '../../Redux/selectedChatSlice'
import { setNotification } from '../../Redux/notificationSlice'
import { getSender,getSenderFull } from '../../utils/chatLogic'
import Profile from '../Profile/Profile'
import UpdateGroupChat from '../UpdateGroupChat/UpdateGroupChat'
import { messageAxios } from '../../utils/axiosRequest'
import '../../utils/styles.css'
import ScrollableChat from '../ScrollableChat/ScrollableChat'
import { io } from 'socket.io-client'


const ENDPOINT = 'http://localhost:4004';
var socket , selectedChatCompare;


const SingleChat = ({fetchAgain,setFetchAgain}) => {

  const [messages,setMessages]  = useState([])
  const [loading,setLoading]  = useState(false)
  const [newMessage,setNewMessage]  = useState()
  const [socketConnected,setSocketConnected]  = useState(false)
  const [typing,setTyping]  = useState(false)
  const [isTyping,setIsTyping]  = useState(false)
  const [uploading,setUploading]  = useState(false)
  const [isRecording,setIsRecording]  = useState(false)
  const fileInputRef = useRef(null)


  const {selectedChat}  = useSelector(state=>state.selectedChatDetails)
  const {notification}  = useSelector(state=>state.notificationDetails)
  const { isDarkMode } = useSelector(state => state.darkMode)
  let {userId}  = useSelector(state=>state.userDetails)
 if(!userId){
    userId =  localStorage.getItem('id')  
  }
  
  const dispatch = useDispatch()
  const toast = useToast()

  useEffect(()=>{
    fetchMessages()
    selectedChatCompare = selectedChat;
  },[selectedChat])

  useEffect(()=>{
    
     socket = io(ENDPOINT, {
      withCredentials: true,
    });
      socket.emit('setup',userId)
      socket.on('connected',()=>{
        setSocketConnected(true)
      })
      socket.on('typing',()=>{
        setIsTyping(true)
      })
      socket.on('stop typing',()=>{
        setIsTyping(false)
      })
  },[])


  useEffect(()=>{
    socket.on('message recieved',(newMessageRecived)=>{
        if(!selectedChatCompare || selectedChatCompare.id !== newMessageRecived.chat.id){
              if(!notification.includes(newMessageRecived)){
        
                  dispatch(setNotification([newMessageRecived]))
                  setFetchAgain(!fetchAgain)
              }
        }
        else{
          setMessages([...messages,newMessageRecived])
        }
    })
  })

  function toastMessage(message,status){
    toast({ 
           title:message,
           status: status,
           duration: 5000,
           isClosable: true,
           position:'bottom'
         })
    }



 async  function sendMessage(e, attachment = null, messageType = 'text'){
    if((e?.key === 'Enter' && newMessage) || attachment){
          socket.emit('stop typing',selectedChat.id)
          try {
             setNewMessage('')
             const messageData = {
                content: newMessage || '',
                chatId: selectedChat.id,
                messageType
             }
             
             if (attachment) {
                messageData.attachment = attachment
             }
             
             const {data}  = await messageAxios.post(`/message`, messageData, {withCredentials:true})
             socket.emit('new message',data)
             setMessages([...messages,data])

          } catch (error) {
                 console.log(error);
                toastMessage('Sending failed','error')   
          }
    }
  }

  function typingHandler(e){
    setNewMessage(e.target.value)

    if(!socketConnected) return

    if(!typing){
      setTyping(true)
      socket.emit('typing',selectedChat.id)
    }

    let lastTypingTime =  new Date().getTime()

    var timerLength = 3000

    setTimeout(()=>{
        var timeNow  = new Date().getTime()
        var timeDiff = timeNow - lastTypingTime

        if(timeDiff >= timerLength && typing){
              socket.emit('stop typing',selectedChat.id)
              setTyping(false)
        }
    },timerLength)
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    
    if (!selectedChat) {
      toastMessage('No chat selected', 'error')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('chatId', selectedChat.id)

    try {
      const { data } = await messageAxios.post('/message/upload', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const messageType = file.type.startsWith('image/') ? 'image' : 'file'
      await sendMessage(null, data.file, messageType)
      
    } catch (error) {
      console.log(error)
      toastMessage('File upload failed', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleVoiceRecorded(audioBlob) {
    if (!selectedChat) {
      toastMessage('No chat selected', 'error')
      return
    }
    
    setUploading(true)
    const formData = new FormData()
    formData.append('voice', audioBlob)
    formData.append('chatId', selectedChat.id)

    try {
      const { data } = await messageAxios.post('/message/upload-voice', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      await sendMessage(null, data.voice, 'voice')
      
    } catch (error) {
      console.log(error)
      toastMessage('Voice message failed', 'error')
    } finally {
      setUploading(false)
    }
  }


  async function fetchMessages() {
    console.log('fetching again');
    if (!selectedChat) return
    try {
      setLoading(true)
      const { data } = await messageAxios.get(`/message/${selectedChat?.id}`, { withCredentials: true })
      setMessages(data)
      setLoading(false)
   
      socket.emit('join chat',selectedChat.id)

    } catch (error) {
      console.log(error);
      toastMessage('Something went wrong', 'error')
    }

  }

 

  return ( 
    <>
      {
        selectedChat ? (
          <>
              <Text
              fontSize={{base:"20px" , md:"30px"}}
              pb={3}
              px={2}
              w={'100%'}
              fontFamily={'Work sans'}
              display={'flex'}
              justifyContent={{base:"space-between"}}
              alignItems={'center'}

              >
                  <IconButton
                  display={{base:"flex"  , md:'none'}}
                  icon={<ArrowBackIcon/>}
                  onClick={()=>dispatch(setSelectedChat(null))}
                  />

                  {
                      !selectedChat.isGroupChat ? (
                          <>
                          {
                            getSender(userId,selectedChat?.users)
                          }
                            <Profile user={ getSenderFull(userId,selectedChat?.users)}/>
                          </>
                      ) : (
                          <>
                          {
                            selectedChat?.chatName.toUpperCase()
                          }
                            <UpdateGroupChat 
                             fetchAgain={fetchAgain} 
                             setFetchAgain={setFetchAgain}
                             fetchMessages={fetchMessages}
                             />

                          </>
                      )

                  }

              </Text>

              <Box
              display={'flex'}
              flexDir={'column'}
              justifyContent={'flex-end'}
              p={3}
              bg={isDarkMode ? 'var(--bg-secondary)' : '#E8E8E8'}
              w={'100%'}
              h={'100%'}
              borderRadius={'lg'}
              overflowY={'hidden'}
              >

                    {
                      loading ? (
                        <Spinner
                        size={'xl'}
                        w={20}
                        h={20}
                        alignSelf={'center'}
                        margin={'auto'}
                        />
                      ):(
                        <div className='messages'>
                            <ScrollableChat messages={messages}/> 
                        </div>
                      )
                    }

                    <FormControl onKeyDown={sendMessage} isRequired mt={3}>
                        {isTyping?<div>
                          <Text style={{color: isDarkMode ? 'var(--text-secondary)' : 'grey', marginBottom:"5px"}}>Typing...</Text>   
                        </div>:<></>}

                        <InputGroup position="relative">
                          <Input
                         variant={'filled'}
                         bg={isDarkMode ? 'var(--bg-primary)' : '#E0E0E0'}
                         color={isDarkMode ? 'var(--text-primary)' : 'black'}
                         borderColor={isDarkMode ? 'var(--border-color)' : 'gray.200'}
                         placeholder={isRecording ? 'Recording...' : 'Enter a message...'} 
                         onChange={typingHandler}
                         value={newMessage}
                         disabled={isRecording}
                         _placeholder={{ color: isDarkMode ? 'var(--text-secondary)' : 'gray.500' }}
                        />
                        <InputRightElement width="auto" pr={2}>
                          {!isRecording && (
                            <IconButton
                              icon={<AttachmentIcon />}
                              size="sm"
                              variant="ghost"
                              isLoading={uploading}
                              onClick={() => fileInputRef.current?.click()}
                              aria-label="Attach file"
                              mr={1}
                              color={isDarkMode ? 'white' : 'gray.600'}
                            />
                          )}
                          <VoiceRecorder 
                            onVoiceRecorded={handleVoiceRecorded}
                            isRecording={isRecording}
                            setIsRecording={setIsRecording}
                            isDarkMode={isDarkMode}
                          />
                        </InputRightElement>
                        </InputGroup>
                        
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          onChange={handleFileUpload}
                          accept="image/*,.pdf,.doc,.docx,.txt"
                        />
                        
                    </FormControl>

              </Box>
          
          </>
        ):(
          <Box display='flex' alignItems={'center'} justifyContent={'center'} height='100%'>
            <Text fontSize='3xl' pb={3} fontFamily='Works sans'> 
                    Click on a user to start chatting 
            </Text>
          </Box>
        )
      } 
    </>
  )
}

export default SingleChat
