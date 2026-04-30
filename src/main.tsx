import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './routes/App.tsx';
import './styles/index.css';
import { QueryClientProvider, queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
