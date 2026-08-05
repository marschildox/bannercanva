import { ReactNode, CSSProperties } from 'react';

interface FixedScaleProps {
  children: ReactNode;
  zoom: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Component that compensates for parent zoom to keep content at fixed scale
 * Useful for UI elements like buttons, labels, etc that should remain readable
 */
export function FixedScale({ children, zoom, className, style }: FixedScaleProps) {
  const inverseScale = 1 / zoom;

  return (
    <div
      className={className}
      style={{
        ...style,
        transform: `scale(${inverseScale})`,
        transformOrigin: 'center',
        // Compensate for the space the element occupies when scaled
        margin: `calc((${inverseScale} - 1) * -0.5em)`,
      }}
    >
      {children}
    </div>
  );
}
