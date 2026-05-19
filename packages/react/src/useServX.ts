import { createContext, useContext } from 'react';

// Context definition to share state between Provider and hook
export interface ServXContextType {
  isMaintenance: boolean;
  isChecking: boolean;
}

export const ServXContext = createContext<ServXContextType>({
  isMaintenance: false,
  isChecking: true,
});

/**
 * Hook to access the ServX maintenance state dynamically.
 * Useful for building custom maintenance screens instead of using the default ServX takeover UI.
 */
export function useServX(): ServXContextType {
  const context = useContext(ServXContext);
  if (!context) {
    throw new Error('useServX must be used within a <ServXProvider>');
  }
  return context;
}
