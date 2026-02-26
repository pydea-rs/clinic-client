import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './routes/App.tsx';
import './styles/index.css';
import { QueryClientProvider, queryClient } from './lib/queryClient';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
