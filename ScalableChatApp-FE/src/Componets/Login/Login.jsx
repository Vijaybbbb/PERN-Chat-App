import React, { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, InputGroup, InputRightElement, Show, VStack } from '@chakra-ui/react';
import { userAxios } from '../../utils/axiosRequest';
import { useToast } from '@chakra-ui/react'
import {useNavigate} from 'react-router-dom'
import { useDispatch } from 'react-redux';
import {storeUser} from '../../Redux/userSlice'

const Login = () => {


  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const [userData, setUserData] = useState({
    email: '',
    password: '',
  });
  const [show, setShow] = useState(false);

  const handleChange = (event) => {
    setUserData({
      ...userData,
      [event.target.name]: event.target.value,
    });
  };

  const handleShowHide = () => setShow(!show);

  function toastMessage(message,status){
    toast({
           title:message,
           status: status,
           duration: 5000,
           isClosable: true,
           position:'bottom'
         })
}



  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!userData.email || !userData.password) {  
      console.error('All fields are required.');
      return;
    }

    try {
      const response = await userAxios.post(`/user/login`, userData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      //console.log(response);
      toastMessage('Login Successfull','success') 
      dispatch(storeUser(response.data))
      localStorage.setItem('id',response.data.id)                  
      navigate('/chats')
    } catch (error) {
      //console.log(error);
      toastMessage(error.response.data.message,'error')
                      
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <FormControl id="email" isRequired>
        <FormLabel>Email</FormLabel>
        <Input
          placeholder="Enter Email ID"
          name="email"
          value={userData.email}
          onChange={handleChange}
        />
      </FormControl>

      <FormControl id="password" isRequired>
        <FormLabel>Password</FormLabel>
        <InputGroup>
          <Input
            placeholder="Enter Password"
            name="password"
            type={show ? 'text' : 'password'}
            value={userData.password}
            onChange={handleChange}
          />
          <InputRightElement w="4.5rem">
            <Button h="1.75rem" size="sm" onClick={handleShowHide}>
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button colorScheme="blue" width="100%" mt={15} onClick={handleSubmit}>
        Login
      </Button>
      <Button
        variant="solid"
        colorScheme="red"
        width="100%"
        mt={15}
        onClick={() => setUserData({ email: 'guest@example.com', password: '123' })}
      >
        Get Guest User Credentials
      </Button>
    </VStack>
  );
};

export default Login;
