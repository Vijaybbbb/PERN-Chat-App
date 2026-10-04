import React, { useEffect, useState } from 'react'
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  HStack,
  Spinner,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { ChatIcon, StarIcon } from '@chakra-ui/icons'
import { messageAxios } from '../../utils/axiosRequest'

const AiChatTools = ({ selectedChat, isDarkMode, onSelectReply }) => {
  const [summary, setSummary] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setSummary(null)
    setSuggestions([])
    setError('')
  }, [selectedChat?.id])

  const requestAi = async (path, action) => {
    setLoading(action)
    setError('')
    try {
      const { data } = await messageAxios.get(path, { withCredentials: true })
      if (action === 'summary') setSummary(data)
      if (action === 'replies') setSuggestions(data.suggestions || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'AI feature is unavailable right now')
    } finally {
      setLoading('')
    }
  }

  if (!selectedChat) return null

  return (
    <Box className="ai-chat-tools" bg={isDarkMode ? 'whiteAlpha.100' : 'blue.50'}>
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
        <HStack spacing={2}>
          <Badge colorScheme="purple" borderRadius="full" px={2}>AI assist</Badge>
          <Text fontSize="xs" color={isDarkMode ? 'gray.300' : 'gray.600'}>
            {selectedChat.isGroupChat ? 'Summarize the discussion or draft a reply' : 'Draft a reply with AI'}
          </Text>
        </HStack>
        <HStack spacing={2}>
          {selectedChat.isGroupChat && (
            <Button
              size="xs"
              variant="outline"
              colorScheme="purple"
              leftIcon={loading === 'summary' ? <Spinner size="xs" /> : <StarIcon />}
              onClick={() => requestAi(`/message/ai/summary/${selectedChat.id}`, 'summary')}
              isDisabled={Boolean(loading)}
            >
              Summarize
            </Button>
          )}
          <Button
            size="xs"
            variant="outline"
            colorScheme="blue"
            leftIcon={loading === 'replies' ? <Spinner size="xs" /> : <ChatIcon />}
            onClick={() => requestAi(`/message/ai/smart-replies/${selectedChat.id}`, 'replies')}
            isDisabled={Boolean(loading)}
          >
            Smart replies
          </Button>
        </HStack>
      </HStack>

      {error && (
        <Alert status="warning" mt={3} borderRadius="md" fontSize="sm">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {summary && (
        <VStack align="stretch" spacing={2} mt={3} className="ai-summary-card">
          <Text fontWeight="700" fontSize="sm">{summary.title}</Text>
          <Text fontSize="sm">{summary.summary}</Text>
          {summary.keyPoints?.length > 0 && (
            <Box>
              <Text fontSize="xs" fontWeight="700" textTransform="uppercase" color="purple.500">Key points</Text>
              {summary.keyPoints.map((point, index) => <Text key={`${point}-${index}`} fontSize="sm">• {point}</Text>)}
            </Box>
          )}
          {summary.actionItems?.length > 0 && (
            <Box>
              <Text fontSize="xs" fontWeight="700" textTransform="uppercase" color="purple.500">Action items</Text>
              {summary.actionItems.map((item, index) => <Text key={`${item}-${index}`} fontSize="sm">• {item}</Text>)}
            </Box>
          )}
        </VStack>
      )}

      {suggestions.length > 0 && (
        <Box mt={3}>
          <Text fontSize="xs" fontWeight="700" textTransform="uppercase" color="blue.500" mb={2}>Tap to use a suggestion</Text>
          <Wrap>
            {suggestions.map((suggestion, index) => (
              <WrapItem key={`${suggestion.reply}-${index}`}>
                <Button
                  size="sm"
                  variant="ghost"
                  bg={isDarkMode ? 'whiteAlpha.200' : 'white'}
                  onClick={() => {
                    onSelectReply(suggestion.reply)
                    setSuggestions([])
                  }}
                  whiteSpace="normal"
                  h="auto"
                  py={2}
                >
                  {suggestion.reply}
                </Button>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      )}
    </Box>
  )
}

export default AiChatTools
