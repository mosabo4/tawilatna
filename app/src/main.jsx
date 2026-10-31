import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './store'
import App from './App'
import '@fontsource/readex-pro/400.css'
import '@fontsource/readex-pro/500.css'
import '@fontsource/readex-pro/600.css'
import '@fontsource/readex-pro/700.css'
import '@fontsource/lalezar/400.css'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider><App /></StoreProvider>
  </StrictMode>,
)
