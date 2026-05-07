import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { routeIndex } from '../lib/navigation';

export function useTabDirection(): number {
  const [location] = useLocation();
  const prevLocationRef = useRef(location);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const prev = prevLocationRef.current;
    if (prev !== location) {
      const prevIdx = routeIndex(prev);
      const currIdx = routeIndex(location);
      setDirection(
        prevIdx !== -1 && currIdx !== -1 && prevIdx !== currIdx
          ? currIdx > prevIdx ? 1 : -1
          : 0,
      );
      prevLocationRef.current = location;
    }
  }, [location]);

  return direction;
}
