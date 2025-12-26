
import { Avatar, Box, Text } from '@chakra-ui/react'
import React from 'react'

const UserListItem = ({user,handleFunction}) => {

  return (
    <Box
    cursor='pointer'
    onClick={handleFunction}
    bg='#E8E8E8'
    _hover={{
       background:'#38B3AC',
       color:"white"
    }}
    w='100%'
    display={'flex'}
    alignItems='center'
    color='black'
    px={3}
    py={2}
    mb={2}
    borderRadius='lg'
    >

       <Avatar
       mr={2}
       size={'sm'}
       cursor={'pointer'}
       name={user.name}
       src={user.pic}

       />
       <Box>
              <Text>{user.name}</Text>
              <Text fontSize='xs'>User Emial</Text>
       </Box>
       
    </Box>
  )
}

export default UserListItem
