/**
 * Setup Guard Component
 *
 * Checks if first-run setup is needed and redirects accordingly.
 * Should wrap the login page to redirect to setup wizard if needed.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getSetupStatus } from '@features/setup';

interface SetupGuardProps {
  children: React.ReactNode;
}

export function SetupGuard({ children }: SetupGuardProps) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const status = await getSetupStatus();
      if (status.needsSetup) {
        setNeedsSetup(true);
        setLocation('/setup');
      }
    } catch (error) {
      // If API fails, assume setup is complete and let login handle errors
      if (import.meta.env.DEV) {
        console.warn('Could not check setup status:', error);
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Show nothing while checking (prevents flash)
  if (isChecking) {
    return null;
  }

  // If needs setup, don't render children (redirect will happen)
  if (needsSetup) {
    return null;
  }

  return <>{children}</>;
}
