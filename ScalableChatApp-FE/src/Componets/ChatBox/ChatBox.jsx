import React from 'react'

import {setSelectedChat} from '../../Redux/selectedChatSlice'
import { useSelector } from 'react-redux'
import { Box } from '@chakra-ui/react'
import SingleChat from '../SingleChat/SingleChat'
import VideoCall from '../VideoCall/VideoCall'
import { getSenderFull } from '../../utils/chatLogic'

const ChatBox = ({fetchAgain,setFetchAgain,callSocket,currentUser}) => {

  const {selectedChat} = useSelector(state=> state.selectedChatDetails)
  const { isDarkMode } = useSelector(state => state.darkMode)
  const targetUser = selectedChat && !selectedChat.isGroupChat
    ? getSenderFull(currentUser?.id, selectedChat.users)
    : null

  return (
    <Box
    className="chat-surface chat-main"
    position="relative"
    display={{base:selectedChat ? 'flex' : 'none' ,md:"flex"}}
    alignItems={'center'}
    flexDir={'column'}
    p={3}
    bg={isDarkMode ? 'var(--bg-primary)' : 'white'}
    color={isDarkMode ? 'var(--text-primary)' : 'black'}
    w={{base:"100%",md:'68%'}}
    borderRadius={'lg'}
    borderWidth={'1px'}
    borderColor={isDarkMode ? 'var(--border-color)' : 'gray.200'}
    >
      <Box className="call-controls-dock">
        <VideoCall
          socket={callSocket}
          currentUser={currentUser}
          targetUser={targetUser}
          isDarkMode={isDarkMode}
        />
      </Box>
      <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain}/>
    </Box>
  )
}

export default ChatBox
