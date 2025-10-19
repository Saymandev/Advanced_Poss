import { useEffect, useState } from 'react';

/**
 * Custom hook to handle hydration issues in Next.js
 * Prevents hydration mismatches by ensuring client-side rendering
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
