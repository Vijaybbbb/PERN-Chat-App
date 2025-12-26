import React, { useState } from 'react'
import {
       Modal,
       ModalOverlay,
       ModalContent,
       ModalHeader,
       ModalFooter,
       ModalBody,
       ModalCloseButton,
       useDisclosure,
       Button,
       useToast,
       FormControl,
       Input,
       Box,
     } from '@chakra-ui/react'
import { useDispatch, useSelector } from 'react-redux'
import { userAxios, chatAxios } from '../../utils/axiosRequest'
import UserListItem from '../UserlistItem/UserListItem'
import UserBadgeItem from '../UserBadgeItem/UserBadgeItem'
import { setChat } from '../../Redux/chatsSlice'




const GroupChat = ({children,fetchAgain,setFetchAgain}) => {



  const { isOpen, onOpen, onClose } = useDisclosure()
  const [groupChatName, setGroupChatName] = useState()
  const [selectedUsers, setSelectedUsers] = useState([])
  const [search, setSearch] = useState('')
  const [searchResult, setSearchResult] = useState([])
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const { userName, pic, userId } = useSelector(state => state.userDetails)
  const { chats } = useSelector(state => state.chatDetails)
  const dispatch = useDispatch()

       function toastMessage(message,status){
        toast({ 
               title:message,
               status: status,
               duration: 5000,
               isClosable: true,
               position:'bottom'
             })
        }


       async function handleSearch(query){
            setSearch(query)
            if(!query){
              return
            }

            try {
                setLoading(true)
                const {data}  =await userAxios.get(`/user/allUsers?search=${search}`,{withCredentials:true})
                setLoading(false)
                setSearchResult(data)
            } catch (error) {
              toastMessage('Failed','error')
            }
        }

        function handleGroup(userToAdd){
            if(selectedUsers.includes(userToAdd)){  
                toastMessage('User already Added','error')
                return
            }
            else{
                setSelectedUsers([...selectedUsers,userToAdd])
            }
        }

        function handleDelete (userToDelete){
            setSelectedUsers(
              selectedUsers.filter((user)=> user.id !== userToDelete.id)
            )
        }

        
       async function handleSubmit(e){
          e.preventDefault()

          if(!groupChatName || !selectedUsers){
              toastMessage('Please fill all the fields')
              return
          }


          try {
            const {data} = await chatAxios.post(`/chat/create/group`,{
              name:groupChatName,
              users:selectedUsers.map(u=>u.id)
            },{withCredentials:true})
     
            dispatch(setChat(data,...chats))
            setFetchAgain(!fetchAgain)
            onClose()
            toastMessage("New Group Chat Created " ,"success")
            
        } catch (error) {
          console.log(error);
            toastMessage("Group Chat Creation Failed " ,"error")
        }
           
        }
 
        return (
       <>
       <span onClick={onOpen}>{children}</span>
  
       <Modal isOpen={isOpen} onClose={onClose}>
         <ModalOverlay />
         <ModalContent>
           <ModalHeader
              fontSize={'35px'}
              fontFamily={'Works sans'}
              display={'flex'}
              justifyContent={'center'}

           >Create Group Chat</ModalHeader>
           <ModalCloseButton />

           <ModalBody
           display={'flex'}
           flexDir={'column'}
           alignItems={'center'}
           
           >

              <FormControl>
                    <Input
                      placeholder='Chat Name'
                      mb={3}
                      onChange={(e) => { setGroupChatName(e.target.value) }}
                    />
              </FormControl>
              <FormControl>
                    <Input
                      placeholder='Add Users eq: John , Mac , ...'
                      mb={1}
                      onChange={(e) => { handleSearch(e.target.value) }}
                    />
              </FormControl>

                  <Box w={'100%'} display={'flex'} flexWrap={'wrap'}>
                    {
                      selectedUsers.map((user) => (
                        <UserBadgeItem

                          key={userId}
                          user={user}
                          handleFunction={() => handleDelete(user)}
                        />
                      ))
                    }
                  </Box>

              {
                loading ? (
                  <div>Loading</div>
                ):(
                  searchResult?.slice(0,4).map((user)=>(
                    <UserListItem key={user.id} user={user} handleFunction={()=>handleGroup(user)}/>
                  ))
                )
              }
             
           </ModalBody>
 
           <ModalFooter>
             <Button colorScheme='blue' onClick={handleSubmit}> 
               Create Chat
             </Button>
        
           </ModalFooter>
         </ModalContent>
       </Modal>
     </>
  )
}

export default GroupChat
