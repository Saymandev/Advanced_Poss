'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type IndustryType = 'restaurant' | 'retail';

interface IndustryContextType {
  activeIndustry: IndustryType;
  setActiveIndustry: (industry: IndustryType) => void;
}

const IndustryContext = createContext<IndustryContextType | undefined>(undefined);

export function IndustryProvider({ children }: { children: React.ReactNode }) {
  const [activeIndustry, setActiveIndustry] = useState<IndustryType>('restaurant');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Load from local storage on initial mount
    const saved = localStorage.getItem('selectedIndustry') as IndustryType;
    if (saved === 'restaurant' || saved === 'retail') {
      setActiveIndustry(saved);
    }
  }, []);

  const handleSetIndustry = (industry: IndustryType) => {
    setActiveIndustry(industry);
    localStorage.setItem('selectedIndustry', industry);
  };

  return (
    <IndustryContext.Provider value={{ activeIndustry, setActiveIndustry: handleSetIndustry }}>
      {/* Ensure children always render, but suppress hydration mismatches by returning a consistent initial state, or just render children normally and let effect sync */}
      {isMounted ? children : <div className="invisible">{children}</div>}
    </IndustryContext.Provider>
  );
}

export function useIndustry() {
  const context = useContext(IndustryContext);
  if (context === undefined) {
    throw new Error('useIndustry must be used within an IndustryProvider');
  }
  return context;
}
