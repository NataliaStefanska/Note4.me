import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { UIProvider } from './context/UIContext'
import { AppProvider } from './context/AppContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <UIProvider>
          <BrowserRouter>
            <AppProvider>
              <App />
            </AppProvider>
          </BrowserRouter>
        </UIProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
