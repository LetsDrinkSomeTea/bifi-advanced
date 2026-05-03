import * as React from 'react';
import { Eye, EyeOff, Play, Pause } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface ToggleSwitchProps {
  label?: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  mode?: 'switch' | 'visibility' | 'playback';
}

export function ToggleSwitch({
  label,
  active,
  onToggle,
  disabled,
  className,
  variant = 'outline',
  size = 'default',
  mode = 'switch',
}: ToggleSwitchProps): React.JSX.Element {
  if (mode === 'visibility' || mode === 'playback') {
    const ActiveIcon = mode === 'visibility' ? Eye : Pause;
    const InactiveIcon = mode === 'visibility' ? EyeOff : Play;

    return (
      <Button
        variant={variant}
        size={size === 'default' ? 'icon' : size}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        disabled={disabled}
        className={cn(
          'transition-colors',
          mode === 'visibility'
            ? active
              ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
              : 'text-red-500 hover:text-red-600 hover:bg-red-50'
            : active
            ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'
            : 'text-green-500 hover:text-green-600 hover:bg-green-50',
          className,
        )}
        title={label}
      >
        {active ? <ActiveIcon size={18} /> : <InactiveIcon size={18} />}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={disabled}
      className={cn(
        'flex items-center justify-between px-3 py-2.5 h-auto font-bold transition-all w-full',
        active ? 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10' : 'text-muted-foreground',
        className,
      )}
    >
      <span className="text-xs">{label}</span>
      <div
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
          active ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            active ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </div>
    </Button>
  );
}
