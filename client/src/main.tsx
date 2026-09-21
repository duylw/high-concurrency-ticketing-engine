import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/main.css'
import { ToastProvider } from '@/context/ToastContext'
import { AuthProvider } from '@/context/AuthContext'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
