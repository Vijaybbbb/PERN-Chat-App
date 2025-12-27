import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import useFetch from '../../Hooks/useFetch'
import { Box, Button, Stack, Text, Avatar, HStack } from '@chakra-ui/react'
import { AddIcon } from '@chakra-ui/icons'
import Chatloading from '../Chatloading/Chatloading'
import { setSelectedChat } from '../../Redux/selectedChatSlice'
import { useNavigate } from 'react-router-dom'
import {getSender, getSenderFull} from '../../utils/chatLogic'
import GroupChat from '../GroupChat/GroupChat'
import { setChat } from '../../Redux/chatsSlice'

const MyChats = ({fetchAgain,setFetchAgain}) => {
  let {userId}  = useSelector(state=>state.userDetails)
  if(!userId){
    userId =  localStorage.getItem('id')  
  }
  const {selectedChat}  = useSelector(state=>state.selectedChatDetails)
  const {chats}  = useSelector(state=>state.chatDetails)
  const { isDarkMode } = useSelector(state => state.darkMode)
  const [loggedUser,setLoggedUser]  = useState(userId)
  const {data,refetchData } = useFetch(`/chat/api/fetchChats`)

  const navigate  = useNavigate()
  const dispatch = useDispatch()

useEffect(()=>{
  refetchData()
},[fetchAgain,chats])



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
              <HStack spacing={3}>
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
                <Text>
                  {!chat?.isGroupChat ? getSender(loggedUser,chat?.users) : chat?.chatName} 
                </Text>
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
