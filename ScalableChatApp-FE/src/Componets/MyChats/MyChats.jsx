import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import useFetch from '../../Hooks/useFetch'
import { Box, Button, Stack, Text, Avatar, HStack, VStack } from '@chakra-ui/react'
import { AddIcon } from '@chakra-ui/icons'
import Chatloading from '../Chatloading/Chatloading'
import { setSelectedChat } from '../../Redux/selectedChatSlice'
import { useNavigate } from 'react-router-dom'
import {getSender, getSenderFull} from '../../utils/chatLogic'
import GroupChat from '../GroupChat/GroupChat'
import { setChat } from '../../Redux/chatsSlice'
import io from 'socket.io-client'

const ENDPOINT = 'http://localhost:4004'
let socket;

const MyChats = ({fetchAgain,setFetchAgain}) => {
  let {userId}  = useSelector(state=>state.userDetails)
  if(!userId){
    userId =  localStorage.getItem('id')  
  }
  const {selectedChat}  = useSelector(state=>state.selectedChatDetails)
  const {chats}  = useSelector(state=>state.chatDetails)
  const { isDarkMode } = useSelector(state => state.darkMode)
  const [loggedUser,setLoggedUser]  = useState(userId)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const {data,refetchData } = useFetch(`/chat/api/fetchChats`)

  const navigate  = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    socket = io(ENDPOINT)
    socket.emit('setup', userId)
    socket.emit('get online users')
    
    socket.on('online users', (users) => {
      setOnlineUsers(new Set(users))
    })
    
    socket.on('user online', (userId) => {
      setOnlineUsers(prev => new Set([...prev, userId]))
    })
    
    socket.on('user offline', (userId) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    })
    
    return () => socket.disconnect()
  }, [])

  useEffect(()=>{
    refetchData()
  },[fetchAgain,chats])

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const truncateMessage = (message, maxLength = 30) => {
    if (!message) return 'No messages yet'
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message
  }

  const isUserOnline = (chat) => {
    if (chat?.isGroupChat) return false
    const otherUser = chat?.users?.find(user => user.id !== loggedUser)
    return otherUser ? onlineUsers.has(otherUser.id) : false
  }



  return (
    <Box
      display={{ base: selectedChat ? 'none' : 'flex', md: 'flex' }}
      flexDir={'column'}
      alignItems={'center'}
      p={3}
      bg={isDarkMode ? 'var(--bg-primary)' : 'white'}
      color={isDarkMode ? 'var(--text-primary)' : 'black'}
      w={{ base: '100%', md: '31%' }}
      borderRadius={'lg'}
      borderWidth={'1px'}
      borderColor={isDarkMode ? 'var(--border-color)' : 'gray.200'}
    >
      <Box
        pb={3}
        px={3}
        fontSize={{ base: "28px", md: '30px' }}
        fontFamily={'Works sans'}
        display={'flex'}
        w={'100%'}
        justifyContent={'space-between'}
        alignItems={'center'}
      >
          My Chats
        <GroupChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain}>
          <Button
            display={'flex'}
            fontSize={{ base: "17px", md: '10px', lg: '17px' }}
            rightIcon={<AddIcon />}
            >
            New Group Chat
          </Button>
        </GroupChat>
      </Box>


      <Box
      display={'flex'}
      flexDir={'column'}
      p={3}
      bg={isDarkMode ? 'var(--bg-secondary)' : '#F8F8F8'}
      w={'100%'}
      h={'100%'}
      borderRadius={'lg'}
      overflow={'hidden'}
      >

    {
      chats ? (
        <Stack overflowY={'scroll'}>
          {data?.map((chat)=>(
            <Box
                 onClick={()=>dispatch(setSelectedChat(chat))}
                 cursor={'pointer'}
                 bg={selectedChat === chat ? '#38B2AC' : (isDarkMode ? 'var(--bg-primary)' : '#E8E8E8') }
                 color={selectedChat === chat ? 'white' : (isDarkMode ? 'var(--text-primary)' : 'black')}
                 px={3}
                 py={2}
                 borderRadius={'lg'}
                 key={chat.id}
            >
              <HStack spacing={3} justify="space-between">
                <HStack spacing={3} flex={1}>
                  <Box position="relative">
                    {!chat?.isGroupChat ? (
                      <Avatar 
                        size="sm" 
                        name={getSender(loggedUser, chat?.users)} 
                        src={getSenderFull(loggedUser, chat?.users)?.pic}
                      />
                    ) : (
                      <Avatar 
                        size="sm" 
                        name={chat?.chatName}
                        bg="teal.500"
                        icon={<Text fontSize="xs">👥</Text>}
                      />
                    )}
                    {isUserOnline(chat) && (
                      <Box
                        position="absolute"
                        bottom="0"
                        right="0"
                        w="12px"
                        h="12px"
                        bg="green.400"
                        borderRadius="full"
                        border="2px solid"
                        borderColor={isDarkMode ? 'var(--bg-primary)' : 'white'}
                      />
                    )}
                  </Box>
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontWeight="semibold" fontSize="sm">
                      {!chat?.isGroupChat ? getSender(loggedUser,chat?.users) : chat?.chatName} 
                    </Text>
                    <Text 
                      fontSize="xs" 
                      color={selectedChat === chat ? 'whiteAlpha.800' : (isDarkMode ? 'var(--text-secondary)' : 'gray.600')}
                      noOfLines={1}
                    >
                      {chat?.latestMessage ? 
                        truncateMessage(chat.latestMessage.content) : 
                        'No messages yet'
                      }
                    </Text>
                  </VStack>
                </HStack>
                {chat?.latestMessage && (
                  <Text 
                    fontSize="xs" 
                    color={selectedChat === chat ? 'whiteAlpha.700' : (isDarkMode ? 'var(--text-secondary)' : 'gray.500')}
                    minW="fit-content"
                  >
                    {formatTime(chat.latestMessage.createdAt)}
                  </Text>
                )}
              </HStack>
            </Box>   
          ))}
        </Stack>
      ):(
        <Chatloading/>
      )
    }
      </Box>

    </Box>
  )
}

export default MyChats
