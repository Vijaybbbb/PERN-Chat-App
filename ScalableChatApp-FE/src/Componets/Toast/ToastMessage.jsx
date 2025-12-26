import React from 'react'
import { useToast } from '@chakra-ui/react'

const ToastMessage = () => {
       const toast = useToast()

       toast({
              title: 'Select an image',
              status: 'error',
              duration: 5000,
              isClosable: true,
              position:'bottom'
            })

  return (
    <div>
      
    </div>
  )
}

export default ToastMessage
