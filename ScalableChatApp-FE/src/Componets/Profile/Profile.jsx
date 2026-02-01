import { ViewIcon } from '@chakra-ui/icons'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, useDisclosure, Image, Text, IconButton } from '@chakra-ui/react';


import React, { Children } from 'react'

const Profile = ({user,children}) => {
       const { isOpen, onOpen, onClose } = useDisclosure()

  return (
   <>
    {children ? (  
       <span onClick={onOpen}>{children}</span>
    ):(
       <IconButton d={{base:'flex'}} icon={<ViewIcon/>} onClick={onOpen} /> 
    )}

       <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent> 
          <ModalHeader
              fontSize={'30px'}
              fontFamily={'Work sans'}
              d='flex'
              justifyContent={'center'}
          
          >{user.userName || "Unknown"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody
              display={'flex'}
              flexDirection={'column'}
              alignItems={'center'}
              justifyContent={'space-between'}
        
          >
                      <Image
                            borderRadius="full"
                            boxSize='150px'
                            src={user.pic}
                            alt='Image'
                      />
          <Text mt={5}>{user?.email}</Text>
                      
          </ModalBody>
          <ModalFooter  >
            <Button colorScheme='blue' mr={3} onClick={onClose}>
              Close
            </Button>
          
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default Profile
