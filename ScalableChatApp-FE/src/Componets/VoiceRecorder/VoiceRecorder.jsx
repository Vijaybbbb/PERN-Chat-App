import React, { useState, useRef } from 'react';
import { IconButton, Box, Text, Flex } from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';

const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
  </svg>
);

const VoiceRecorder = ({ onVoiceRecorded, isRecording, setIsRecording, isDarkMode }) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          onVoiceRecorded(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
      // Clear audio chunks to prevent sending
      audioChunksRef.current = [];
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <Flex 
        alignItems="center" 
        bg="red.50" 
        borderRadius="full" 
        px={3} 
        py={1}
        position="absolute"
        right={2}
        top="50%"
        transform="translateY(-50%)"
        zIndex={10}
      >
        <IconButton
          icon={<CloseIcon />}
          size="xs"
          variant="ghost"
          colorScheme="red"
          onClick={cancelRecording}
          aria-label="Cancel recording"
          mr={2}
        />
        <Text fontSize="sm" color="red.600" mr={3}>
          🔴 {formatTime(recordingTime)}
        </Text>
        <IconButton
          icon={<MicIcon />}
          size="sm"
          variant="solid"
          colorScheme="red"
          onClick={stopRecording}
          aria-label="Send voice message"
        />
      </Flex>
    );
  }

  return (
    <IconButton
      icon={<MicIcon />}
      size="sm"
      variant="ghost"
      colorScheme="gray"
      onClick={startRecording}
      aria-label="Start voice recording"
      color={isDarkMode ? 'white' : 'gray.600'}
    />
  );
};

export default VoiceRecorder;