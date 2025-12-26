import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import SlideDrawer from '../../Componets/SlideDrawer/SlideDrawer'
import { Box } from '@chakra-ui/react'
import ChatBox from '../../Componets/ChatBox/ChatBox'
import MyChats from '../../Componets/MyChats/MyChats'

const ChatPage = () => {
  
  let {userId}  = useSelector(state=>state.userDetails)
  if(!userId){
    userId =  localStorage.getItem('id')  
  }
  const [fetchAgain,setFetchAgain]  = useState(false)


  return (
    <div style={{width:'100%'}}>
      {userId && <SlideDrawer/>}
      <Box
      display={'flex'}
      justifyContent={'space-between'}
      w='100%'
      h='91.5vh'
      p='10px'
      >
        {userId && <MyChats  fetchAgain={fetchAgain} setFetchAgain={setFetchAgain}/>}
        {userId && <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain}/>}
      </Box>
    </div>
  )
}

export default ChatPage
