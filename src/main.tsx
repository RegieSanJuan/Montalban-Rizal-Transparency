import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import PortalProvider from './components/PortalProvider';
import './styles/fonts.css';
import './styles/theme.css';
import './styles/app.css';
import './styles/editorial.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PortalProvider>
        <App />
      </PortalProvider>
    </BrowserRouter>
  </StrictMode>,
);
