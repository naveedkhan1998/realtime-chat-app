/**
 * Performance utilities for optimizing resource usage
 */

/**
 * Throttle function - limits how often a function can be called
 * @param func Function to throttle
 * @param delay Minimum time between calls in milliseconds
 * @returns Throttled function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      // Schedule for later if not already scheduled
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          timeoutId = null;
          func(...args);
        }, delay - timeSinceLastCall);
      }
    }
  };
}

/**
 * Debounce function - delays execution until after delay has elapsed since last call
 * @param func Function to debounce
 * @param delay Time to wait in milliseconds
 * @returns Debounced function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Simple compression using LZ-based algorithm for strings
 * Only compress if the string is large enough to benefit
 * @param str String to compress
 * @param threshold Minimum size in bytes to compress (default 1024)
 * @returns Compressed string or original if below threshold
 */
export function compressString(str: string, threshold = 1024): string {
  if (str.length < threshold) {
    return str;
  }
  
  // Simple run-length encoding for repeated characters
  let compressed = '';
  let count = 1;
  
  for (let i = 0; i < str.length; i++) {
    if (i < str.length - 1 && str[i] === str[i + 1]) {
      count++;
    } else {
      if (count > 3) {
        compressed += `${str[i]}×${count}`;
      } else {
        compressed += str[i].repeat(count);
      }
      count = 1;
    }
  }
  
  // Only return compressed if it's actually smaller
  return compressed.length < str.length ? compressed : str;
}

/**
 * Decompress a string compressed with compressString
 * @param str Potentially compressed string
 * @returns Decompressed string
 */
export function decompressString(str: string): string {
  // Check if string contains compression markers
  if (!str.includes('×')) {
    return str;
  }
  
  return str.replace(/(.?)×(\d+)/g, (_, char, count) => {
    return char.repeat(parseInt(count, 10));
  });
}

/**
 * Check if a payload should be optimized based on size
 * @param data Any data to check
 * @param threshold Size threshold in bytes
 * @returns true if data should be optimized
 */
export function shouldOptimize(data: unknown, threshold = 1024): boolean {
  const size = JSON.stringify(data).length;
  return size >= threshold;
}
