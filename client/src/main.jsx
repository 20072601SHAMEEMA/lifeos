import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/landing.css';
import './styles/pages.css';
import './styles/emergency.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <SettingsProvider>
              <LocationProvider>
                <App />
              </LocationProvider>
            </SettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
