import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import SlideDrawer from '../../Componets/SlideDrawer/SlideDrawer'
import { Box } from '@chakra-ui/react'
import ChatBox from '../../Componets/ChatBox/ChatBox'
import MyChats from '../../Componets/MyChats/MyChats'
import { getAccessToken, getStoredUser } from '../../utils/auth'
import { io } from 'socket.io-client'
import { storeUser } from '../../Redux/userSlice'
import { isAuthenticated } from '../../utils/auth'

const SOCKET_ENDPOINT = import.meta.env.VITE_SOCKET_SERVICE_URL || (import.meta.env.DEV ? 'http://localhost:4004' : window.location.origin)

const ChatPage = () => {
  
  const dispatch = useDispatch()
  const navigate = useNavigate()
  let {userId, userName}  = useSelector(state=>state.userDetails)
  const [fetchAgain,setFetchAgain]  = useState(false)
  const [callSocket, setCallSocket] = useState(null)

  const activeUserId = userId || getStoredUser()?.id || localStorage.getItem('id')
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

  useEffect(() => {
    if (!activeUserId || !getAccessToken()) return undefined

    const socket = io(SOCKET_ENDPOINT, {
      withCredentials: true,
      auth: { token: getAccessToken() },
    })

    socket.on('connect', () => socket.emit('setup', activeUserId))
    setCallSocket(socket)

    return () => {
      socket.disconnect()
      setCallSocket(null)
    }
  }, [activeUserId])

  // Don't render anything if user is not authenticated
  if (!activeUserId && !isAuthenticated()) {
    return null
  }

  return (
    <div className="chat-page-shell">
      <SlideDrawer/>
      <Box
      className="chat-workspace"
      display={'flex'}
      justifyContent={'space-between'}
      p='0'
      >
        <MyChats  fetchAgain={fetchAgain} setFetchAgain={setFetchAgain}/>
        <ChatBox
          fetchAgain={fetchAgain}
          setFetchAgain={setFetchAgain}
          callSocket={callSocket}
          currentUser={{ id: activeUserId, name: userName || getStoredUser()?.name }}
        />
      </Box>
    </div>
  )
}

export default ChatPage
