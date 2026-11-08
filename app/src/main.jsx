import { StrictMode } from 'react'
import { PerksProvider } from './perks'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './store'
import App from './App'
import { enableDragScroll } from './dragscroll'
import '@fontsource/alexandria/300.css'
import '@fontsource/alexandria/400.css'
import '@fontsource/alexandria/500.css'
import '@fontsource/alexandria/600.css'
import '@fontsource/alexandria/700.css'
import './index.css'

enableDragScroll()
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider><PerksProvider><App /></PerksProvider></StoreProvider>
  </StrictMode>,
)
