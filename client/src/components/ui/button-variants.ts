import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover',
        destructive:
          'gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive-hover',
        ghost_destructive:
          'gap-1.5 text-destructive hover:bg-destructive-soft hover:text-destructive-strong',
        outline:
          'gap-1.5 border border-input bg-background hover:bg-primary-soft hover:text-primary-strong',
        dashed: 'gap-1.5 border-dashed border hover:bg-primary-soft hover:text-primary-strong',
        secondary: 'gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        ghost: 'gap-1.5 hover:bg-primary-soft hover:text-primary-strong',
        link: 'gap-1.5 text-primary underline-offset-4 hover:underline',
        accent_dashed:
          'rounded-2xl border-4 border-dashed border-accent-soft text-accent-strong font-black flex flex-col hover:bg-accent-soft hover:border-accent-strong/60 transition-all',
        'primary-soft': 'gap-1.5 bg-primary-soft text-primary-strong hover:bg-primary-soft-hover',
        'destructive-soft':
          'gap-1.5 bg-destructive-soft text-destructive-strong hover:bg-destructive-soft-hover',
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
