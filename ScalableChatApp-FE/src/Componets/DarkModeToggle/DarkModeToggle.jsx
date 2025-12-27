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
    >
      {isDarkMode ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

export default DarkModeToggle