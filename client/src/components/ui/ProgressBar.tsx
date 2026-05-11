import { useState, useEffect } from 'react';
import { formatCents } from '../../lib/utils';

interface Props {
  value: number;
  max: number;
  format?: 'count' | 'cents';
  barHeight?: string;
  labelSize?: string;
}

export function ProgressBar({
  value,
  max,
  format = 'count',
  barHeight = 'h-1',
  labelSize = 'text-[9px]',
}: Props): React.JSX.Element {
  const [animWidth, setAnimWidth] = useState(0);

  useEffect(() => {
    const targetWidth = Math.min(value / max, 1) * 100;
    const id = requestAnimationFrame(() => {
      setAnimWidth(targetWidth);
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [value, max]);

  const fmt = (v: number): string =>
    format === 'cents' ? formatCents(v) : v.toLocaleString('de-DE');

  return (
    <div className="w-full">
      <div
        className={`flex justify-between ${labelSize} text-muted-foreground leading-none mb-0.5`}
      >
        <span>{fmt(value)}</span>
        <span>{fmt(max)}</span>
      </div>
      <div className={`${barHeight} bg-muted rounded-full overflow-hidden`}>
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
          style={{ width: `${animWidth}%` }}
        />
      </div>
    </div>
  );
}
