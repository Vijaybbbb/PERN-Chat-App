import React from 'react'

import {setSelectedChat} from '../../Redux/selectedChatSlice'
import { useSelector } from 'react-redux'
import { Box } from '@chakra-ui/react'
import SingleChat from '../SingleChat/SingleChat'

const ChatBox = ({fetchAgain,setFetchAgain}) => {

  const {selectedChat} = useSelector(state=> state.selectedChatDetails)

  return (
    <Box
    display={{base:selectedChat ? 'flex' : 'none' ,md:"flex"}}
    alignItems={'center'}
    flexDir={'column'}
    p={3}
    bg={'white'}
    w={{base:"100%",md:'68%'}}
    borderRadius={'lg'}
    borderWidth={'1px'}
    >
      <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain}/>
    </Box>
  )
}

export default ChatBox
