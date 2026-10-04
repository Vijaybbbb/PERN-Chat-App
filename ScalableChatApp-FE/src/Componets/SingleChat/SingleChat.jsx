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
import AiChatTools from '../AiChatTools/AiChatTools'
import { io } from 'socket.io-client'
import { getAccessToken } from '../../utils/auth'


const ENDPOINT = import.meta.env.VITE_SOCKET_SERVICE_URL || (import.meta.env.DEV ? 'http://localhost:4004' : window.location.origin);
var socket;


const SingleChat = ({setFetchAgain}) => {

  const [messages,setMessages]  = useState([])
  const [loading,setLoading]  = useState(false)
  const [newMessage,setNewMessage]  = useState('')
  const [socketConnected,setSocketConnected]  = useState(false)
  const [typing,setTyping]  = useState(false)
  const [isTyping,setIsTyping]  = useState(false)
  const [uploading,setUploading]  = useState(false)
  const [isRecording,setIsRecording]  = useState(false)
  const fileInputRef = useRef(null)
  const socketRef = useRef(null)
  const selectedChatRef = useRef(null)
  const messagesRef = useRef([])
  messagesRef.current = messages


  const {selectedChat}  = useSelector(state=>state.selectedChatDetails)
  const {notification}  = useSelector(state=>state.notificationDetails)
  const { isDarkMode } = useSelector(state => state.darkMode)
  let {userId, userName}  = useSelector(state=>state.userDetails)
 if(!userId){
    userId =  localStorage.getItem('id')  
  }
  
  const dispatch = useDispatch()
  const toast = useToast()
  useEffect(()=>{
    selectedChatRef.current = selectedChat
    fetchMessages()
  },[selectedChat])

  useEffect(()=>{
    
     socket = io(ENDPOINT, {
      withCredentials: true,
      auth: { token: getAccessToken() },
    });
      socketRef.current = socket
      console.log('Socket connecting to:', ENDPOINT);
      socket.on('connect', () => {
        socket.emit('setup', userId)
      })
      socket.on('connected',()=>{
        console.log('Socket connected successfully');
        setSocketConnected(true)
        if (selectedChatRef.current) {
          socket.emit('join chat', selectedChatRef.current.id)
          markMessagesAsRead(messagesRef.current)
        }
      })
      socket.on('typing',()=>{
        console.log('Typing event received');
        setIsTyping(true)
      })
      socket.on('stop typing',()=>{
        console.log('Stop typing event received');
        setIsTyping(false)
      })
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      return () => {
        socket.off('connected')
        socket.off('typing')
        socket.off('stop typing')
        socket.off('connect_error')
        socket.disconnect()
        socketRef.current = null
      }
  },[])


  useEffect(()=>{
    if (!socketRef.current) return

    const handleMessageReceived = (newMessageRecived) => {
        console.log('Message received:', newMessageRecived);
        const messageChatId = newMessageRecived.chat?.id || newMessageRecived.chatId
        const isCurrentChat = String(selectedChatRef.current?.id) === String(messageChatId)

        // Receipt is emitted only after this browser has actually received it.
        socketRef.current.emit('message delivered', { messageId: newMessageRecived.id })

        if(!isCurrentChat){
              if(!notification.some((message) => message.id === newMessageRecived.id)){
                  dispatch(setNotification([newMessageRecived]))
              }
        }
        else{
          setMessages((previousMessages) => previousMessages.some(message => message.id === newMessageRecived.id)
            ? previousMessages
            : [...previousMessages, newMessageRecived])
          // A message received while its chat is open is read immediately.
          socketRef.current.emit('message read', { messageId: newMessageRecived.id })
        }
        // Always trigger chat list refresh for latest message update
        setFetchAgain(prev => !prev)
    }

    const handleStatusUpdated = (statusUpdate) => {
      setMessages((previousMessages) => previousMessages.map((message) =>
        message.id === statusUpdate.messageId
          ? { ...message, deliveryStatus: statusUpdate.deliveryStatus }
          : message
      ))
    }

    socketRef.current.on('message recieved', handleMessageReceived)
    socketRef.current.on('message status updated', handleStatusUpdated)

    return () => {
      socketRef.current?.off('message recieved', handleMessageReceived)
      socketRef.current?.off('message status updated', handleStatusUpdated)
    }
  },[dispatch, notification, setFetchAgain])

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
          socketRef.current?.emit('stop typing',selectedChat.id)
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
             console.log('Message sent:', data);
             // RabbitMQ + Socket service fan out the message to recipients.
             // The sender updates its own UI from the API response.
             setMessages((previousMessages) => [...previousMessages, data])
             setFetchAgain(prev => !prev) // Refresh chat list

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
      socketRef.current?.emit('typing',selectedChat.id)
    }

    let lastTypingTime =  new Date().getTime()

    var timerLength = 3000

    setTimeout(()=>{
        var timeNow  = new Date().getTime()
        var timeDiff = timeNow - lastTypingTime

        if(timeDiff >= timerLength && typing){
              socketRef.current?.emit('stop typing',selectedChat.id)
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
      const { data } = await messageAxios.post(`/message/upload/${selectedChat.id}`, formData, {
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


  function markMessagesAsRead(messageList) {
    const unreadMessageIds = messageList
      .filter((message) => message.sender?.id !== userId)
      .map((message) => message.id)

    if (unreadMessageIds.length > 0) {
      socketRef.current?.emit('messages read', unreadMessageIds)
    }
  }

  async function fetchMessages() {
    console.log('fetching again');
    if (!selectedChat) return
    try {
      setLoading(true)
      const { data } = await messageAxios.get(`/message/${selectedChat?.id}`, { withCredentials: true })
      messagesRef.current = data
      setMessages(data)
      setLoading(false)

      socketRef.current?.emit('join chat',selectedChat.id)
      markMessagesAsRead(data)

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
              className="chat-header"
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

              <AiChatTools
                selectedChat={selectedChat}
                isDarkMode={isDarkMode}
                onSelectReply={setNewMessage}
              />

              <Box
              className="message-panel"
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

                    <FormControl className="message-composer" onKeyDown={sendMessage} isRequired mt={3}>
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
          <Box className="empty-chat" display='flex' flexDir="column" alignItems={'center'} justifyContent={'center'} height='100%'>
            <Text fontSize='3xl' pb={3} className="brand-title" fontWeight="700">
                    Choose a conversation
            </Text>
            <Text color="var(--text-secondary)" maxW="340px" textAlign="center">
              Pick someone from your messages to start a secure, real-time conversation.
            </Text>
          </Box>
        )
      } 
    </>
  )
}

export default SingleChat
