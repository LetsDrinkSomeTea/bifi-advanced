import * as React from 'react';
import { cn } from '../../lib/utils';

type HorizontalScrollProps = React.HTMLAttributes<HTMLDivElement>;

const HorizontalScroll = React.forwardRef<HTMLDivElement, HorizontalScrollProps>(
  ({ className, children, ...props }, _ref) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [leftFade, setLeftFade] = React.useState(false);
    const [rightFade, setRightFade] = React.useState(false);

    React.useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      const update = (): void => {
        const scrollLeft = el.scrollLeft;
        const scrollWidth = el.scrollWidth;
        const clientWidth = el.clientWidth;
        setLeftFade(scrollLeft > 0);
        setRightFade(scrollLeft < scrollWidth - clientWidth - 1);
      };

      update();
      el.addEventListener('scroll', update, { passive: true });
      // Also update on resize
      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(el);

      return () => {
        el.removeEventListener('scroll', update);
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div className={cn('relative', className)} {...props}>
        {leftFade ? (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
        ) : null}
        <div ref={scrollRef} className="overflow-x-auto scrollbar-thin-x">
          {children}
        </div>
        {rightFade ? (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
        ) : null}
      </div>
    );
  },
);

HorizontalScroll.displayName = 'HorizontalScroll';

export { HorizontalScroll };
