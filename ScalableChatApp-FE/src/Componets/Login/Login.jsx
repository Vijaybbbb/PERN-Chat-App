import React, { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, InputGroup, InputRightElement, Show, VStack } from '@chakra-ui/react';
import { userAxios } from '../../utils/axiosRequest';
import { useToast } from '@chakra-ui/react'
import {useNavigate} from 'react-router-dom'
import { useDispatch } from 'react-redux';
import {storeUser} from '../../Redux/userSlice'
import { setStoredUser } from '../../utils/auth';

const Login = () => {


  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const [userData, setUserData] = useState({
    email: '',
    password: '',
  });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

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
      toastMessage('All fields are required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await userAxios.post(`/user/login`, userData);
      
      // Store user data with access token
      const userWithToken = {
        ...response.data,
        accessToken: response.data.accessToken
      };
      
      dispatch(storeUser(userWithToken));
      setStoredUser(userWithToken);
      
      toastMessage('Login Successful','success') 
      navigate('/chats')
    } catch (error) {
      toastMessage(error.response?.data?.message || 'Login failed','error')
    } finally {
      setLoading(false);
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

      <Button 
        colorScheme="blue" 
        width="100%" 
        mt={15} 
        onClick={handleSubmit}
        isLoading={loading}
        loadingText="Logging in..."
      >
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
