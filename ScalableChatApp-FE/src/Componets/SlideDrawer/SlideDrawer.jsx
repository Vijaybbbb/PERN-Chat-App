import React, { Profiler, useEffect, useState } from 'react'
import './SlideDrawer.css'
import { Avatar, Badge, Box, Button, ChakraBaseProvider, Input, Menu, MenuButton, MenuItem, MenuList, Spinner, Text, Tooltip, useDisclosure, useToast } from '@chakra-ui/react'
import { BellIcon, ChevronDownIcon } from '@chakra-ui/icons'
import { useDispatch, useSelector } from 'react-redux'
import Profile from '../Profile/Profile'
import { userAxios,chatAxios} from '../../utils/axiosRequest'
import { useNavigate } from 'react-router-dom'
import {storeUser} from '../../Redux/userSlice'
import {removeNotification, setNotification} from '../../Redux/notificationSlice'
import {setSelectedChat} from '../../Redux/selectedChatSlice'
import {setChat} from '../../Redux/chatsSlice'

import {
       Drawer,
       DrawerBody,
       DrawerFooter,
       DrawerHeader,
       DrawerOverlay,
       DrawerContent,
       DrawerCloseButton,
     } from '@chakra-ui/react'
import Chatloading from '../Chatloading/Chatloading'
import UserListItem from '../UserlistItem/UserListItem'
import { getSender, getSenderFull } from '../../utils/chatLogic'





const SlideDrawer = () => {

 const {userName,pic,userId} = useSelector(state => state.userDetails)
 const user = useSelector(state => state.userDetails)
 const {chats} = useSelector(state => state.chatDetails) 
 const {selectedChat} = useSelector(state => state.selectedChatDetails)

  const [reciver,setReciever]  = useState('')
  const [search,setSearch]  = useState('')
  const [searchResult,setSearchResult]  = useState([])
  const [loading,setLoading]  = useState(false)
  const [loadingChat,setLoadingChat]  = useState()
  const {notification}  = useSelector(state=>state.notificationDetails)

  const navigate  = useNavigate()
  const dispatch = useDispatch()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()


  function handleLogout(e){
       e.preventDefault()
       chatAxios.post(`/clearCookie`,{withCredentials:true}).then(()=>{
              localStorage.clear()
              dispatch(storeUser({
                     userId:null,
                     userName:null,
                     pic:null
              }))
              dispatch(setSelectedChat(null)); 
              dispatch(setNotification([]));
              navigate('/')
             }).catch(err=>console.log(err))
}


async function handleSearch(e){
       e.preventDefault()
       if(search==''){
              toast({
                     title:'Search is empty',
                     status: 'error',
                     duration: 1000,
                     isClosable: true, 
                     position:'top-left'
                   })
       }

       try {
              setLoading(true)
              const {data}  = await userAxios.get(`/user/allUsers?search=${search}`,{withCredentials:true})
              setLoading(false)
              setSearchResult(data)

       } catch (error) {
              toast({
                     title:'Something went wrong',
                     status: 'error',
                     duration: 1000,
                     isClosable: true, 
                     position:'top-left'
                   })
       }
}

async function accessChat(userid) {
       try {
         setLoadingChat(true);
         const { data } = await chatAxios.post(`/chat/${userid}`, {}, { withCredentials: true });
         setChat(data)
         if (!chats.find((c) => c.id === data.id)) {
           dispatch(setChat(data)); // Dispatch addChatToStore action
         }
     
         dispatch(setSelectedChat(data)); // Dispatch setSelectedChatAction action
         setLoadingChat(false);
         onClose();
       } catch (error) {
         console.error(error);
       }
     }
     


  return (
    <div>
       <Box
   
   display="flex"
   justifyContent="space-between"
   alignItems="center"
   bg="white"
   w="100%"
   p="5px 10px"
   borderWidth="5px"

       >
              <Tooltip label='Search Users to Chat ' hasArrow placement='bottom-end'>
                     <Button variant={'ghost'} onClick={onOpen}>
                         <i class="fa-solid fa-magnifying-glass"></i>
                         <Text d={{base:'none',md:'flex'}} px='4'>
                            Search User
                         </Text>
                     </Button>
              </Tooltip>

              <Text fontSize={'2xl'} fontFamily={'works sans'}>
                     Chat-Line
              </Text>

              <div>
                     <Menu>
                                     <MenuButton p={1}>
                                            <BellIcon fontSize={'2xl'} m={1} />
                                            <Badge borderRadius={'full'} bg={'red'} color={'white'} mt={-6} ml={-3}>
                                                 {notification.length > 0  ? notification.length : ''}
                                          </Badge>
                                           
 
                                     </MenuButton>
                            <MenuList pl={2}>
                                   {!notification.length ? " No New Messages" :
                                   notification.map(not=>(
                                          <MenuItem key={not.id} onClick={()=>{
                                                 setSelectedChat(not.chat)
                                                 accessChat(getSenderFull(userId,not.chat.users).id)
                                                 dispatch(removeNotification(not.id))
                                          }}>
                                                 {not?.chat?.isGroupChat ? `New Message in ${not?.chat?.chatName}`
                                                  : `New Message From ${getSender(userId,not?.chat?.users)}`}
                                          </MenuItem>
                                   ))}
                            </MenuList>
                     </Menu>
                     <Menu>
                            <MenuButton as={Button} rightIcon={<ChevronDownIcon/>}>
                                   <Avatar size={'sm'} cursor={'pointer'} name={userName} src={pic}/>
                            </MenuButton>
                            <MenuList>
                                            <Profile user={user}>
                                                   <MenuItem>
                                                          My Profile
                                                   </MenuItem>
                                            </Profile>

                                   <MenuItem onClick={handleLogout}>
                                             Log out
                                   </MenuItem>
                            </MenuList>
                     </Menu>
              </div>
       </Box>

       <Drawer
        isOpen={isOpen}
        placement='left'
        onClose={onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Search User</DrawerHeader>

          <DrawerBody>
               <Box display={'flex'} pb={2}>
                            <Input
                            placeholder='Search by name or email'
                            mr={2}
                            value={search}
                            onChange={(e)=>{setSearch(e.target.value)}}
                            />
                            <Button onClick={handleSearch}>Go</Button>
               </Box>
               {loading?(
                     <Chatloading/>  
               ):(
                searchResult?.map((user)=>(
                     <UserListItem
                     key={user.id}
                     user={user}
                     handleFunction={()=>accessChat(user.id)}
                     >
                            
                     </UserListItem>
                ))
               )}
               {loadingChat && <Spinner ml='auto' display={'flex'}/>}
          </DrawerBody>

       
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export default SlideDrawer
