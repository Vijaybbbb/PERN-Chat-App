import React, { useEffect } from 'react'
import ScrollableFeed from 'react-scrollable-feed'
import { isLastMessage, isSameSender, isSameSenderMargin, isSameUser } from '../../utils/chatLogic'
import { useSelector } from 'react-redux'
import { Avatar, Tooltip, Image, Link, Text, Box } from '@chakra-ui/react'
import { DownloadIcon } from '@chakra-ui/icons'
import VoicePlayer from '../VoicePlayer/VoicePlayer'

const ScrollableChat = ({messages}) => {

  let {userId}  = useSelector(state=>state.userDetails)
  if(!userId){
    userId =  localStorage.getItem('id')  
  }
  const { isDarkMode } = useSelector(state => state.darkMode)

  const getMessageBubbleColor = (senderId) => {
    if (isDarkMode) {
      return senderId === userId ? '#4A90E2' : '#48BB78' // Blue for sent, green for received in dark mode
    }
    return senderId === userId ? '#BEE3F8' : '#9ad99f' // Original light mode colors
  }

  return (
    <ScrollableFeed>
       {
              messages && messages.map((m,i)=>(
                     <div style={{display:'flex'}} key={m.id}>
                                   {
                                          (isSameSender(messages,m,i,userId)) || 
                                          (isLastMessage(messages,i,userId)) ?
                                          (
                                          <Tooltip
                                                 label={m.sender.name}
                                                 placement='bottom-start'
                                                 hasArrow
                                          >
                                                        <Avatar
                                                        mt={'7px'}
                                                        mr={1}
                                                        size={'sm'}
                                                        cursor={'pointer'}
                                                        name={m.sender.name}
                                                        src={m.sender.pic}
                                                        />

                                          </Tooltip>
                                          ):(
                                                 <>
                                               {
                                                      (isSameSender(messages,m,i,userId)) && (
                                                        <Tooltip
                                                        label={m.sender.name}
                                                        placement='bottom-start'
                                                        hasArrow
                                                 >
                                                               <Avatar
                                                               mt={'7px'}
                                                               mr={1}
                                                               size={'sm'}
                                                               cursor={'pointer'}
                                                               name={m.sender.name}
                                                               src={m.sender.pic}
                                                               />
       
                                                 </Tooltip>        
                                                 )
                                             }
                                          </>
                                          )
                                   }
                                   <div style={{
                                          background: getMessageBubbleColor(m.sender.id),
                                          color: isDarkMode ? 'white' : 'black',
                                          borderRadius:'20px',
                                          padding:'5px 15px',
                                          maxWidth:'75%',
                                          marginLeft:isSameSenderMargin(messages,m,i,userId),
                                          marginTop:isSameUser(messages,m,i,userId) ? 3 : 10

                                   }}>
                                                 {m.messageType === 'image' && m.attachment ? (
                                                   <Box>
                                                     <Image 
                                                       src={m.attachment.fileUrl} 
                                                       alt={m.attachment.fileName}
                                                       maxW="200px"
                                                       borderRadius="md"
                                                       mb={m.content ? 2 : 0}
                                                     />
                                                     {m.content && <Text color={isDarkMode ? 'white' : 'black'}>{m.content}</Text>}
                                                   </Box>
                                                 ) : m.messageType === 'voice' && m.attachment ? (
                                                   <Box>
                                                     <VoicePlayer 
                                                       audioUrl={m.attachment.fileUrl}
                                                       duration={m.attachment.duration}
                                                     />
                                                     {m.content && <Text mt={2} color={isDarkMode ? 'white' : 'black'}>{m.content}</Text>}
                                                   </Box>
                                                 ) : m.messageType === 'file' && m.attachment ? (
                                                   <Box>
                                                     <Link 
                                                       href={m.attachment.fileUrl} 
                                                       download={m.attachment.fileName}
                                                       display="flex"
                                                       alignItems="center"
                                                       color={isDarkMode ? '#87CEEB' : 'blue.500'}
                                                       mb={m.content ? 2 : 0}
                                                     >
                                                       <DownloadIcon mr={2} />
                                                       <Text fontSize="sm">{m.attachment.fileName}</Text>
                                                     </Link>
                                                     {m.content && <Text color={isDarkMode ? 'white' : 'black'}>{m.content}</Text>}
                                                   </Box>
                                                 ) : (
                                                   m.content
                                                 )}

                                   </div>
                     </div>
              ))
       }
    </ScrollableFeed>
  )
}

export default ScrollableChat
