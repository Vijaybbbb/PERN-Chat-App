import React, { useState, useRef, useEffect } from 'react';
import { IconButton, Box, Text, Slider, SliderTrack, SliderFilledTrack, SliderThumb } from '@chakra-ui/react';

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const PauseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);

const VoicePlayer = ({ audioUrl, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setAudioDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value) => {
    const audio = audioRef.current;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box display="flex" alignItems="center" minW="200px" p={2}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <IconButton
        icon={isPlaying ? <PauseIcon /> : <PlayIcon />}
        size="sm"
        variant="ghost"
        onClick={togglePlay}
        mr={2}
        minW="auto"
        h="auto"
        p={1}
      />
      
      <Box flex="1" mx={2}>
        <Slider
          value={currentTime}
          max={audioDuration}
          onChange={handleSeek}
          size="sm"
        >
          <SliderTrack bg="gray.200">
            <SliderFilledTrack bg="blue.400" />
          </SliderTrack>
          <SliderThumb boxSize={3} />
        </Slider>
      </Box>
      
      <Text fontSize="xs" color="gray.500" minW="40px">
        {formatTime(audioDuration - currentTime)}
      </Text>
    </Box>
  );
};

export default VoicePlayer;