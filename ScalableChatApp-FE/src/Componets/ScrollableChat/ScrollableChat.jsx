import React, { useEffect, useState } from 'react'
import ScrollableFeed from 'react-scrollable-feed'
import { isLastMessage, isSameSender, isSameSenderMargin, isSameUser } from '../../utils/chatLogic'
import { useSelector } from 'react-redux'
import { Avatar, Tooltip, Image, Link, Text, Box, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody, Flex, Icon } from '@chakra-ui/react'
import { DownloadIcon, AttachmentIcon } from '@chakra-ui/icons'
import VoicePlayer from '../VoicePlayer/VoicePlayer'

const ScrollableChat = ({messages}) => {
  const [expandedImage, setExpandedImage] = useState(null)

  let {userId}  = useSelector(state=>state.userDetails)
  if(!userId){
    userId =  localStorage.getItem('id')  
  }
  const { isDarkMode } = useSelector(state => state.darkMode)

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase()
    
    switch(ext) {
      case 'pdf': return '📄'
      case 'doc': case 'docx': return '📝'
      case 'xls': case 'xlsx': return '📊'
      case 'ppt': case 'pptx': return '📋'
      case 'zip': case 'rar': return '🗜️'
      case 'txt': return '📃'
      default: return '📎'
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getMessageBubbleColor = (senderId) => {
    const isOwnMessage = String(senderId) === String(userId)
    if (isDarkMode) {
      return isOwnMessage ? '#176d9f' : '#24344a'
    }
    return isOwnMessage ? '#dff3ff' : '#ffffff'
  }

  const getDeliveryLabel = (deliveryStatus) => {
    if (!deliveryStatus || deliveryStatus.recipientCount === 0) return '✓ Sent'

    const { recipientCount, deliveredCount, readCount } = deliveryStatus
    if (readCount > 0) {
      return readCount === recipientCount ? '✓✓ Read' : `✓✓ Read ${readCount}/${recipientCount}`
    }
    if (deliveredCount > 0) {
      return deliveredCount === recipientCount ? '✓✓ Delivered' : `✓✓ Delivered ${deliveredCount}/${recipientCount}`
    }
    return '✓ Sent'
  }

  return (
    <ScrollableFeed>
       {
              messages && messages.map((m,i)=>(
                     <div className={`message-row ${String(m.sender.id) === String(userId) ? 'message-row--outgoing' : 'message-row--incoming'}`} key={m.id}>
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
                                   <div className="message-bubble" style={{
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
                                                       cursor="pointer"
                                                       onClick={() => setExpandedImage(m.attachment.fileUrl)}
                                                       onError={(e) => console.log('Image load error:', e.target.src)}
                                                       _hover={{ opacity: 0.8 }}
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
                                                   <Box
                                                     bg={isDarkMode ? 'whiteAlpha.100' : 'blackAlpha.50'}
                                                     borderRadius="md"
                                                     p={3}
                                                     maxW="250px"
                                                     cursor="pointer"
                                                     _hover={{ bg: isDarkMode ? 'whiteAlpha.200' : 'blackAlpha.100' }}
                                                     onClick={() => window.open(m.attachment.fileUrl, '_blank')}
                                                   >
                                                     <Flex align="center" gap={3}>
                                                       <Text fontSize="2xl">{getFileIcon(m.attachment.fileName)}</Text>
                                                       <Box flex={1} minW={0}>
                                                         <Text 
                                                           fontSize="sm" 
                                                           fontWeight="medium"
                                                           color={isDarkMode ? 'white' : 'black'}
                                                           noOfLines={1}
                                                         >
                                                           {m.attachment.fileName}
                                                         </Text>
                                                         <Text 
                                                           fontSize="xs" 
                                                           color={isDarkMode ? 'gray.300' : 'gray.600'}
                                                         >
                                                           {formatFileSize(m.attachment.fileSize) || 'Document'}
                                                         </Text>
                                                       </Box>
                                                       <DownloadIcon color={isDarkMode ? 'gray.300' : 'gray.600'} />
                                                     </Flex>
                                                     {m.content && <Text mt={2} fontSize="sm" color={isDarkMode ? 'white' : 'black'}>{m.content}</Text>}
                                                   </Box>
                                                 ) : (
                                                   <Text color={isDarkMode ? 'white' : 'black'}>
                                                     {m.content || `[${m.messageType}] ${m.attachment?.fileName || 'Unknown file'}`}
                                                   </Text>
                                                 )}

                                                 {m.sender.id === userId && (
                                                   <Text
                                                     mt={1}
                                                     textAlign="right"
                                                     fontSize="xs"
                                                     color={isDarkMode ? 'whiteAlpha.700' : 'blue.700'}
                                                     aria-label={`Message status: ${getDeliveryLabel(m.deliveryStatus)}`}
                                                   >
                                                     {getDeliveryLabel(m.deliveryStatus)}
                                                   </Text>
                                                 )}
                                   </div>
                     </div>
              ))
       }
       
       <Modal isOpen={!!expandedImage} onClose={() => setExpandedImage(null)} size="xl">
         <ModalOverlay bg="blackAlpha.800" />
         <ModalContent bg="transparent" boxShadow="none" maxW="90vw" maxH="90vh">
           <ModalCloseButton color="white" size="lg" top={4} right={4} zIndex={2} />
           <ModalBody p={0}>
             <Image 
               src={expandedImage} 
               alt="Expanded image"
               w="100%"
               h="auto"
               maxH="90vh"
               objectFit="contain"
             />
           </ModalBody>
         </ModalContent>
       </Modal>
    </ScrollableFeed>
  )
}

export default ScrollableChat
