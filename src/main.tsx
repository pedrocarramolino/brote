import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppStoreProvider } from './store/AppStore';
import { FeedbackProvider } from './components/ui/Feedback';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStoreProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </AppStoreProvider>
  </StrictMode>,
);
