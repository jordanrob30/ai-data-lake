/**
 * Custom hook for debounced hover state management
 */

import { useState, useCallback, useRef } from 'react';

/**
 * Creates a debounced hover state handler
 * Prevents rapid state changes that can cause performance issues
 *
 * @param delay - Debounce delay in milliseconds (default 50ms)
 * @returns Hover state and handlers
 */
export function useDebouncedHover(delay = 50) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback((itemId: string) => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set hover state after delay
    timeoutRef.current = setTimeout(() => {
      setHoveredItem(itemId);
    }, delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear hover state immediately
    setHoveredItem(null);
  }, []);

  const clearHover = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHoveredItem(null);
  }, []);

  return {
    hoveredItem,
    handleMouseEnter,
    handleMouseLeave,
    clearHover,
  };
}