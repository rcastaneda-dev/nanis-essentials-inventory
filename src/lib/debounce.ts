/**
 * Debounce utility with requestIdleCallback support for non-critical writes
 */

export function debounce<T extends (..._args: any[]) => void>(
  fn: T,
  delay: number
): (..._args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (..._args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(..._args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Schedule work during idle time with a timeout fallback
 * This is ideal for non-critical writes like persisting to localStorage
 */
export function scheduleIdleWork(callback: () => void, timeout = 2000): void {
  if ('requestIdleCallback' in window) {
    const _handle = requestIdleCallback(
      () => {
        callback();
      },
      { timeout }
    );
    // Store handle for potential cancellation (not implemented here, but could be added)
    return;
  }

  // Fallback for browsers without requestIdleCallback
  setTimeout(callback, 0);
}

/**
 * Debounced idle work scheduler
 * Combines debouncing with idle callback for optimal non-blocking persistence
 */
export function createDebouncedIdleScheduler(
  callback: () => void,
  debounceMs = 300,
  idleTimeout = 2000
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let idleHandle: number | null = null;

  return () => {
    // Clear any pending work
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (idleHandle !== null && 'cancelIdleCallback' in window) {
      cancelIdleCallback(idleHandle);
      idleHandle = null;
    }

    // Debounce: wait for user to stop making changes
    timeoutId = setTimeout(() => {
      timeoutId = null;

      // Schedule work during idle time
      if ('requestIdleCallback' in window) {
        requestIdleCallback(
          () => {
            idleHandle = null;
            callback();
          },
          { timeout: idleTimeout }
        );
      } else {
        // Fallback: execute immediately
        callback();
      }
    }, debounceMs);
  };
}
