import { Box, Text, TabList, Tab, TabPanels, TabPanel, Tabs, Button, HStack, Badge } from '@chakra-ui/react'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Login from '../../Componets/Login/Login'
import Signup from '../../Componets/Signup/Signup'
import DarkModeToggle from '../../Componets/DarkModeToggle/DarkModeToggle'
import { isAuthenticated } from '../../utils/auth'

const HomePage = () => {
  const { userId } = useSelector(state => state.userDetails)
  const navigate = useNavigate()
  
  useEffect(() => {
    // Check if user is already authenticated
    if (userId || isAuthenticated()) {
      navigate('/chats')
    }
  }, [userId, navigate])
  
  const openAdminPanel = () => {
    window.open('http://localhost:4005/admin', '_blank');
  };

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <Text className="eyebrow">A calmer way to connect</Text>
        <Text className="hero-title">Conversations that feel close, wherever you are.</Text>
        <Text className="hero-copy">
          Chat Line brings your people, messages, voice notes, and calls together in one focused space.
          Simple enough for every day, polished enough for the moments that matter.
        </Text>
        <HStack spacing={3} mt={8} flexWrap="wrap">
          <Badge colorScheme="blue" px={3} py={2} borderRadius="full">Real-time messaging</Badge>
          <Badge colorScheme="green" px={3} py={2} borderRadius="full">Private by design</Badge>
        </HStack>
      </section>

      <section className="auth-card">
        <HStack justify="space-between" align="center" mb={8}>
          <Box>
            <Text className="brand-title" fontSize="2xl" fontWeight="700">Chat Line</Text>
            <Text color="var(--text-secondary)" fontSize="sm" mt={1}>Welcome back. Let’s get you connected.</Text>
          </Box>
          <HStack spacing={1}>
            <DarkModeToggle />
            <Button size="sm" variant="ghost" colorScheme="red" onClick={openAdminPanel}>Admin</Button>
          </HStack>
        </HStack>

        <Tabs variant="soft-rounded" colorScheme="blue">
          <TabList bg="var(--surface-soft)" p={1} borderRadius="14px">
            <Tab width="50%">Log in</Tab>
            <Tab width="50%">Create account</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0} pt={8}><Login /></TabPanel>
            <TabPanel px={0} pt={8}><Signup /></TabPanel>
          </TabPanels>
        </Tabs>
      </section>
    </div>
  )
}

export default HomePage
