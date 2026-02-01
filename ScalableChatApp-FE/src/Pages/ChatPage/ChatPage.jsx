import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import SlideDrawer from '../../Componets/SlideDrawer/SlideDrawer'
import { Box } from '@chakra-ui/react'
import ChatBox from '../../Componets/ChatBox/ChatBox'
import MyChats from '../../Componets/MyChats/MyChats'
import { storeUser } from '../../Redux/userSlice'
import { getStoredUser, isAuthenticated } from '../../utils/auth'

const ChatPage = () => {
  
  const dispatch = useDispatch()
  const navigate = useNavigate()
  let {userId, accessToken}  = useSelector(state=>state.userDetails)
  const [fetchAgain,setFetchAgain]  = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      const storedUser = getStoredUser()
      
      if (storedUser && storedUser.id && storedUser.accessToken) {
        dispatch(storeUser(storedUser))
        userId = storedUser.id
      } else {
        // No valid authentication, redirect to login
        navigate('/')
      }
    }
  }, [userId, dispatch, navigate])

  // Don't render anything if user is not authenticated
  if (!userId && !isAuthenticated()) {
    return null
  }

  return (
    <div style={{width:'100%'}}>
      <SlideDrawer/>
      <Box
      display={'flex'}
      justifyContent={'space-between'}
      w='100%'
      h='91.5vh'
      p='10px'
      >
        <MyChats  fetchAgain={fetchAgain} setFetchAgain={setFetchAgain}/>
        <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain}/>
      </Box>
    </div>
  )
}

export default ChatPage
