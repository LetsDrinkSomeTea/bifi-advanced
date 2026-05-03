import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from './Button';

interface NumericCounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const NumericCounter = React.forwardRef<HTMLDivElement, NumericCounterProps>(
  ({ value, onChange, min = 1, max = 99 }, ref) => {
    const handleDecrement = (): void => {
      onChange(Math.max(min, value - 1));
    };

    const handleIncrement = (): void => {
      onChange(Math.min(max, value + 1));
    };

    return (
      <div
        ref={ref}
        className="flex items-center gap-4 bg-muted/50 p-1 rounded-2xl border border-border"
      >
        <Button
          size="icon"
          variant="outline"
          onClick={handleDecrement}
        >
          <Minus size={18} />
        </Button>
        <span className="w-8 text-center font-black text-lg">{value}</span>
        <Button
          size="icon"
          variant="outline"
          onClick={handleIncrement}
        >
          <Plus size={18} />
        </Button>
      </div>
    );
  },
);

NumericCounter.displayName = 'NumericCounter';

export { NumericCounter };
