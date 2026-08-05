import { BannerContent } from '../types/banner';

/**
 * Smart position assignment to avoid overlapping text elements
 */
export function getNextAvailablePosition(existingPositions: string[]): 'top' | 'center' | 'bottom' {
  const positions: ('top' | 'center' | 'bottom')[] = ['center', 'top', 'bottom'];

  // Find the first position not used
  for (const pos of positions) {
    if (!existingPositions.includes(pos)) {
      return pos;
    }
  }

  // If all positions are taken, use the least used one
  const positionCounts = positions.map((pos) => ({
    position: pos,
    count: existingPositions.filter((p) => p === pos).length,
  }));

  positionCounts.sort((a, b) => a.count - b.count);
  return positionCounts[0].position;
}

/**
 * Get next available CTA position cycling through available positions
 */
export function getNextCTAPosition(
  content: BannerContent,
): 'top' | 'center' | 'bottom' | 'left' | 'right' {
  let newPosition: 'top' | 'center' | 'bottom' | 'left' | 'right' = content.ctaPosition;

  // Check if current position is occupied by existing CTA
  if (content.ctas.length > 0) {
    // Cycle through positions to avoid overlap
    const positions: ('bottom' | 'center' | 'top' | 'left' | 'right')[] = [
      'bottom',
      'center',
      'top',
      'left',
      'right',
    ];
    const currentIndex = positions.indexOf(content.ctaPosition);
    const nextIndex = (currentIndex + content.ctas.length) % positions.length;
    newPosition = positions[nextIndex];
  }

  return newPosition;
}

/**
 * Get next available shape position with offset to avoid overlapping
 */
export function getNextShapePosition(content: BannerContent): { x: number; y: number } {
  const existingShapes = content.shapes || [];
  const offset = existingShapes.length * 30; // 30px offset for each existing shape

  return {
    x: 100 + offset,
    y: 100 + offset,
  };
}
