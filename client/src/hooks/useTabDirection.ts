import { useRef, useEffect } from 'react';
import { useLocation } from 'wouter';

const TAB_ORDER = ['/', '/shop', '/verlauf', '/social', '/profile'];

function tabIndex(path: string): number {
  const exact = TAB_ORDER.indexOf(path);
  if (exact !== -1) return exact;
  return TAB_ORDER.findIndex((t) => t !== '/' && path.startsWith(t));
}

export function useTabDirection(): number {
  const [location] = useLocation();
  const prevLocationRef = useRef(location);
  const directionRef = useRef(0);

  useEffect(() => {
    const prev = prevLocationRef.current;
    if (prev !== location) {
      const prevIdx = tabIndex(prev);
      const currIdx = tabIndex(location);
      if (prevIdx !== -1 && currIdx !== -1 && prevIdx !== currIdx) {
        directionRef.current = currIdx > prevIdx ? 1 : -1;
      } else {
        directionRef.current = 0;
      }
      prevLocationRef.current = location;
    }
  });

  return directionRef.current;
}
