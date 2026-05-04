import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-tighter',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        accent: 'border-transparent bg-accent text-accent-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        confirm: 'border-transparent bg-confirm text-confirm-foreground',
        outline: 'text-foreground border-border bg-transparent',

        // Soft variants using new tokens
        'primary-soft': 'border-transparent bg-primary-soft text-primary-strong',
        'secondary-soft': 'border-transparent bg-secondary-soft text-secondary-strong',
        'accent-soft': 'border-transparent bg-accent-soft text-accent-strong',
        'destructive-soft': 'border-transparent bg-destructive-soft text-destructive-strong',
        'confirm-soft': 'border-transparent bg-confirm-soft text-confirm-strong',
        'muted-soft': 'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
