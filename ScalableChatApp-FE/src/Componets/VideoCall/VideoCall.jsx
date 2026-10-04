import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { PhoneIcon, SmallCloseIcon } from '@chakra-ui/icons'

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

const createCallId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const VideoCall = ({ socket, currentUser, targetUser, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [incomingCall, setIncomingCall] = useState(null)
  const [status, setStatus] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [inCall, setInCall] = useState(false)

  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const activeCallRef = useRef(null)
  const callTimeoutRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteStreamRef = useRef(null)

  const stopCall = useCallback((notifyPeer = true) => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }

    const activeCall = activeCallRef.current
    if (notifyPeer && activeCall && socket) {
      socket.emit('call-ended', {
        to: activeCall.remoteUserId,
        callId: activeCall.callId,
      })
    }

    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    remoteStreamRef.current = null
    pendingCandidatesRef.current = []
    activeCallRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setIncomingCall(null)
    setInCall(false)
    setIsOpen(false)
    setStatus('')
    setIsMuted(false)
    setCameraOff(false)
  }, [socket])

  const createPeerConnection = useCallback((remoteUserId, callId) => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS)
    peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('ice-candidate', { to: remoteUserId, candidate, callId })
      }
    }
    peerConnection.ontrack = ({ streams }) => {
      remoteStreamRef.current = streams[0]
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0]
      }
    }
    peerConnection.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(peerConnection.connectionState)) {
        setStatus('Call ended')
      }
    }
    localStreamRef.current?.getTracks().forEach((track) => peerConnection.addTrack(track, localStreamRef.current))
    peerConnectionRef.current = peerConnection
    return peerConnection
  }, [socket])

  const flushPendingCandidates = async (peerConnection) => {
    const candidates = pendingCandidatesRef.current.splice(0)
    for (const candidate of candidates) {
      try {
        await peerConnection.addIceCandidate(candidate)
      } catch (error) {
        console.error('Unable to add queued ICE candidate:', error)
      }
    }
  }

  const getLocalMedia = async () => {
    // Reuse a stream owned by this call controller and release stale tracks
    // before asking the browser for the camera again.
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    return stream
  }

  const startCall = async () => {
    if (!socket || !targetUser?.id) return

    const callId = createCallId()
    setIsOpen(true)
    setStatus('Requesting camera and microphone...')

    try {
      await getLocalMedia()
      activeCallRef.current = { callId, remoteUserId: targetUser.id, callType: 'video' }
      setInCall(true)
      const peerConnection = createPeerConnection(targetUser.id, callId)
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      socket.emit('call-user', {
        to: targetUser.id,
        callId,
        callType: 'video',
        offer,
        callerName: currentUser?.name || 'A contact',
      })
      setStatus(`Calling ${targetUser.name || 'contact'}...`)

      // Do not leave the caller in a permanently pending state when the
      // other browser is offline, blocked, or cannot access its camera.
      callTimeoutRef.current = setTimeout(() => {
        if (activeCallRef.current?.callId !== callId) return
        stopCall(true)
        setIsOpen(true)
        setStatus('No answer. The other person may be offline or unable to access their camera.')
      }, 30000)
    } catch (error) {
      console.error('Unable to start call:', error)
      stopCall(false)
      setIsOpen(true)
      setStatus(error.name === 'NotReadableError'
        ? 'Camera is busy. Close other camera tabs or apps and try again.'
        : 'Camera or microphone permission was denied')
    }
  }

  const acceptCall = async () => {
    if (!socket || !incomingCall) return
    const call = incomingCall
    if (call.callType && call.callType !== 'video') {
      socket.emit('call-rejected', {
        to: call.from,
        callId: call.callId,
        reason: 'Voice calls are currently disabled'
      })
      setIncomingCall(null)
      setStatus('Voice calls are currently disabled')
      return
    }
    setIsOpen(true)
    setStatus('Connecting call...')

    try {
      await getLocalMedia()
      activeCallRef.current = { callId: call.callId, remoteUserId: call.from, callType: 'video' }
      setInCall(true)
      const peerConnection = createPeerConnection(call.from, call.callId)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(call.offer))
      await flushPendingCandidates(peerConnection)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      socket.emit('call-accepted', { to: call.from, callId: call.callId, answer })
      setIncomingCall(null)
      setStatus('Connected')
    } catch (error) {
      console.error('Unable to accept call:', error)
      const errorMessage = error.name === 'NotReadableError'
        ? 'Camera is busy. Close other camera tabs or apps and try again.'
        : 'Camera or microphone permission was denied'
      socket.emit('call-rejected', {
        to: call.from,
        callId: call.callId,
        reason: errorMessage
      })
      stopCall(false)
      setIncomingCall(call)
      setStatus(errorMessage)
    }
  }

  const rejectCall = () => {
    if (socket && incomingCall) {
      socket.emit('call-rejected', { to: incomingCall.from, callId: incomingCall.callId })
    }
    setIncomingCall(null)
  }

  useEffect(() => {
    if (!socket) return undefined

    const handleIncomingCall = (call) => {
      if (activeCallRef.current) {
        socket.emit('call-rejected', { to: call.from, callId: call.callId })
        return
      }
      setIncomingCall(call)
      setStatus(`${call.callerName || 'A contact'} is calling...`)
    }

  const handleCallAccepted = async (call) => {
      if (!activeCallRef.current || activeCallRef.current.callId !== call.callId) return
      try {
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current)
          callTimeoutRef.current = null
        }
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(call.answer))
        await flushPendingCandidates(peerConnectionRef.current)
        setStatus('Connected')
      } catch (error) {
        console.error('Unable to complete call negotiation:', error)
        stopCall(false)
      }
    }

    const handleIceCandidate = async ({ callId, candidate }) => {
      if (!candidate || activeCallRef.current?.callId !== callId) return
      const peerConnection = peerConnectionRef.current
      if (!peerConnection?.remoteDescription) {
        pendingCandidatesRef.current.push(candidate)
        return
      }
      try {
        await peerConnection.addIceCandidate(candidate)
      } catch (error) {
        console.error('Unable to add ICE candidate:', error)
      }
    }

    const handleCallRejected = ({ reason } = {}) => {
      stopCall(false)
      setIsOpen(true)
      setStatus(reason || 'Call declined')
    }

    const handleCallEnded = () => stopCall(false)

    socket.on('incoming-call', handleIncomingCall)
    socket.on('call-accepted', handleCallAccepted)
    socket.on('ice-candidate', handleIceCandidate)
    socket.on('call-rejected', handleCallRejected)
    socket.on('call-ended', handleCallEnded)

    return () => {
      socket.off('incoming-call', handleIncomingCall)
      socket.off('call-accepted', handleCallAccepted)
      socket.off('ice-candidate', handleIceCandidate)
      socket.off('call-rejected', handleCallRejected)
      socket.off('call-ended', handleCallEnded)
    }
  }, [socket, stopCall])

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current
    }
  }, [isOpen, inCall])

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsMuted(!track.enabled)
  }

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setCameraOff(!track.enabled)
  }

  return (
    <>
      {targetUser?.id && (
        <HStack>
          <Button
            size="sm"
            leftIcon={<PhoneIcon />}
            colorScheme="blue"
            variant="outline"
            onClick={startCall}
            isDisabled={!socket || inCall}
          >
            <span className="video-call-label">Video call</span>
          </Button>
        </HStack>
      )}

      <Modal isOpen={isOpen || Boolean(incomingCall)} onClose={() => incomingCall ? rejectCall() : stopCall(true)} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent bg={isDarkMode ? 'var(--bg-primary)' : 'white'}>
          <ModalHeader>{incomingCall ? 'Incoming video call' : 'Video call'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {incomingCall && !activeCallRef.current ? (
              <VStack spacing={4} py={6}>
                <Text>{status}</Text>
                <HStack>
                  <Button colorScheme="green" onClick={acceptCall}>Accept</Button>
                  <Button colorScheme="red" variant="outline" onClick={rejectCall}>Decline</Button>
                </HStack>
              </VStack>
            ) : (
              <>
                <Text mb={3}>{status}</Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  <Box bg="black" borderRadius="md" overflow="hidden" position="relative">
                    <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', display: 'block' }} />
                    <Text position="absolute" left={3} bottom={2} color="white" fontSize="xs" bg="blackAlpha.600" px={2} py={1} borderRadius="md">You</Text>
                  </Box>
                  <Box bg="black" borderRadius="md" overflow="hidden" position="relative">
                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />
                    <Text position="absolute" left={3} bottom={2} color="white" fontSize="xs" bg="blackAlpha.600" px={2} py={1} borderRadius="md">Remote participant</Text>
                  </Box>
                </SimpleGrid>
              </>
            )}
          </ModalBody>
          {!incomingCall && (
            <ModalFooter>
              <HStack>
                <Button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
                <Button onClick={toggleCamera}>{cameraOff ? 'Camera on' : 'Camera off'}</Button>
                <IconButton aria-label="End call" colorScheme="red" icon={<SmallCloseIcon />} onClick={() => stopCall(true)} />
              </HStack>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}

export default VideoCall
