/**
 * Flood fill algorithm for pixel-based coloring.
 * Works on RGBA pixel data from a canvas/bitmap.
 * 
 * Given a tap point, fills all connected pixels of the same color
 * with the target color, bounded by different-colored pixels (the outlines).
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Performs flood fill on pixel data.
 * @param imageData - Uint8ClampedArray of RGBA pixel data
 * @param width - Image width
 * @param height - Image height
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param fillColor - Color to fill with { r, g, b, a }
 * @param tolerance - Color matching tolerance (0-255)
 * @returns Modified imageData with the filled region
 */
export function floodFill(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fillColor: RGBA,
  tolerance: number = 30
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(imageData);
  
  startX = Math.round(startX);
  startY = Math.round(startY);
  
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return result;
  }

  const getPixel = (x: number, y: number): RGBA => {
    const idx = (y * width + x) * 4;
    return {
      r: result[idx],
      g: result[idx + 1],
      b: result[idx + 2],
      a: result[idx + 3],
    };
  };

  const setPixel = (x: number, y: number, color: RGBA) => {
    const idx = (y * width + x) * 4;
    result[idx] = color.r;
    result[idx + 1] = color.g;
    result[idx + 2] = color.b;
    result[idx + 3] = color.a;
  };

  const colorsMatch = (c1: RGBA, c2: RGBA): boolean => {
    return (
      Math.abs(c1.r - c2.r) <= tolerance &&
      Math.abs(c1.g - c2.g) <= tolerance &&
      Math.abs(c1.b - c2.b) <= tolerance &&
      Math.abs(c1.a - c2.a) <= tolerance
    );
  };

  const targetColor = getPixel(startX, startY);

  // Don't fill if we're clicking on a dark outline pixel
  if (targetColor.r < 50 && targetColor.g < 50 && targetColor.b < 50 && targetColor.a > 200) {
    return result;
  }

  // Don't fill if target is already the fill color
  if (colorsMatch(targetColor, fillColor)) {
    return result;
  }

  // BFS flood fill using scanline approach for performance
  const visited = new Uint8Array(width * height);
  const queue: [number, number][] = [[startX, startY]];
  visited[startY * width + startX] = 1;

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    
    if (!colorsMatch(getPixel(x, y), targetColor)) continue;

    setPixel(x, y, fillColor);

    // Check 4 neighbors
    const neighbors: [number, number][] = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = ny * width + nx;
        if (!visited[idx]) {
          visited[idx] = 1;
          if (colorsMatch(getPixel(nx, ny), targetColor)) {
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  return result;
}

/**
 * Convert hex color string to RGBA
 */
export function hexToRGBA(hex: string, alpha: number = 255): RGBA {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
    a: alpha,
  };
}
