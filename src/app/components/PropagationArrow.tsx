import { ArrowDown, ArrowRight } from 'lucide-react';

interface PropagationArrowProps {
  /** 'down' between banners in a column, 'right' between columns */
  direction: 'down' | 'right';
  title?: string;
}

/**
 * The circled arrow that shows content flowing from a master to what inherits
 * from it. Every arrow on the board renders through this component so they
 * share one size, tone and shadow — they used to be three different sizes
 * (48px, 40px and 32px) with three different shadows.
 *
 * Callers wrap this in FixedScale so it keeps its size as the board zooms.
 */
export function PropagationArrow({ direction, title }: PropagationArrowProps) {
  const Icon = direction === 'down' ? ArrowDown : ArrowRight;
  return (
    <div
      title={title}
      className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center shadow-md"
    >
      <Icon className="h-5 w-5 text-white" />
    </div>
  );
}
