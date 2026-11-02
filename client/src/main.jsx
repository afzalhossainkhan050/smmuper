import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { SystemProvider } from './contexts/SystemContext';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SystemProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </SystemProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
