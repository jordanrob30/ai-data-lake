/**
 * Custom hook for creating stable callbacks that don't trigger re-renders
 */

import { useRef, useCallback, useLayoutEffect } from 'react';

/**
 * Creates a stable callback that maintains the same reference across renders
 * This prevents unnecessary re-renders in child components and effects
 *
 * @param callback - The callback function to stabilize
 * @returns A stable version of the callback
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback);

  // Update the ref on each render to have the latest callback
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // Return a stable callback that calls the current ref
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}