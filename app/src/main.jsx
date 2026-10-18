import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: 'inherit', borderRadius: 12 } }} offset={{ bottom: 80, right: 16 }} mobileOffset={{ bottom: 80 }} />
    </BrowserRouter>
  </StrictMode>,
)
