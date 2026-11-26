import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './web.css';
import { App, type BootData } from './App';
import { setInitialData } from './pageData';

function readBootData(): BootData {
  try {
    return JSON.parse(document.getElementById('__DATA__')?.textContent || '{}');
  } catch {
    return {};
  }
}

// createRoot, not hydrateRoot: the server sends only the head and data, and GSAP/framer-motion own the DOM after mount.
const data = readBootData();
setInitialData(data);
// The server put crawler HTML in #root; React replaces it.
const root = document.getElementById('root')!;
root.replaceChildren();
createRoot(root).render(<App data={data} />);
