import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './web.css';
import { App, type BootData } from './App';

function readBootData(): BootData {
  try {
    return JSON.parse(document.getElementById('__DATA__')?.textContent || '{}');
  } catch {
    return {};
  }
}

// createRoot, not hydrateRoot: the server sends only the head and data, and GSAP/framer-motion own the DOM after mount.
createRoot(document.getElementById('root')!).render(<App data={readBootData()} />);
