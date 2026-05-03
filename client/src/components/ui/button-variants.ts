import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'gap-1.5 bg-primary text-primary-foreground hover:bg-primary/80',
        destructive: 'gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90',
        ghost_destructive:
          'gap-1.5 text-destructive hover:bg-destructive/50 hover:text-destructive-foreground',
        outline:
          'gap-1.5 border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        dashed: 'gap-1.5 border-dashed border hover:bg-accent hover:text-accent-foreground',
        secondary: 'gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'gap-1.5 hover:bg-accent hover:text-accent-foreground',
        link: 'gap-1.5 text-primary underline-offset-4 hover:underline',
        yellow_dashed:
          'rounded-2xl border-2 border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 font-black flex flex-col hover:bg-amber-500/5',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        full: 'py-2 w-full rounded',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
