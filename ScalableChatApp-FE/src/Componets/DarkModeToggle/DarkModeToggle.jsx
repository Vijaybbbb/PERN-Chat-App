import React from 'react'
import { Button } from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import { useDispatch, useSelector } from 'react-redux'
import { toggleDarkMode } from '../../Redux/darkModeSlice'

const DarkModeToggle = () => {
  const dispatch = useDispatch()
  const { isDarkMode } = useSelector(state => state.darkMode)

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => dispatch(toggleDarkMode())}
      aria-label="Toggle dark mode"
      color={isDarkMode ? 'var(--text-primary)' : 'gray.600'}
      _hover={{
        bg: isDarkMode ? 'var(--bg-secondary)' : 'gray.100'
      }}
    >
      {isDarkMode ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

export default DarkModeToggle