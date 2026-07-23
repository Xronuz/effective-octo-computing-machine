import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/auth';
import { AlifboProvider } from '@/alifbo';
import App from '@/App';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AlifboProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AlifboProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
