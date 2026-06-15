console.log('[ai-clinic] main.tsx executing');

// Catch any uncaught errors that prevent rendering
window.addEventListener('error', (e) => {
  console.error('[ai-clinic] uncaught error:', e.error || e.message);
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<pre style="color:red;padding:2rem;white-space:pre-wrap">Uncaught error:\n${e.error?.stack || e.message}</pre>`;
  }
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[ai-clinic] unhandled rejection:', e.reason);
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './routes/App.tsx';
import './styles/index.css';
import { QueryClientProvider, queryClient } from './lib/queryClient';

console.log('[ai-clinic] all imports resolved');

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  );
  console.log('[ai-clinic] render() called');
} catch (err) {
  console.error('[ai-clinic] render failed:', err);
  rootElement.innerHTML = `<pre style="color:red;padding:2rem">Render failed: ${err}</pre>`;
}
