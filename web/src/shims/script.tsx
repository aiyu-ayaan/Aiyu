// `next/script`: inject the script once per id/src after mount (the strategies all become afterInteractive).
import { useEffect } from 'react';

type Props = {
  id?: string;
  src?: string;
  strategy?: string;
  dangerouslySetInnerHTML?: { __html: string };
  children?: string;
  onLoad?: () => void;
  async?: boolean;
  crossOrigin?: string;
};

export default function Script({ id, src, dangerouslySetInnerHTML, children, onLoad, crossOrigin }: Props) {
  useEffect(() => {
    const key = id || src;
    if (key && document.querySelector(`script[data-shim-key="${CSS.escape(key)}"]`)) return;
    const el = document.createElement('script');
    if (key) el.dataset.shimKey = key;
    if (src) {
      el.src = src;
      el.async = true;
    }
    if (crossOrigin) el.crossOrigin = crossOrigin;
    const inline = dangerouslySetInnerHTML?.__html ?? children;
    if (inline) el.text = inline;
    if (onLoad) el.addEventListener('load', onLoad);
    document.body.appendChild(el);
  }, [id, src, dangerouslySetInnerHTML, children, onLoad, crossOrigin]);
  return null;
}
