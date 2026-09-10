import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { AnimatePresence } from 'framer-motion';
import { router } from './routes';
import StartupAnimation from '../components/startup/StartupAnimation';

export default function App() {
  const [showStartup, setShowStartup] = useState(() => {
    // Show 3-second startup animation on initial application start / Home page load
    try {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
      return pathname === '/' || pathname === '';
    } catch {
      return false;
    }
  });

  return (
    <>
      <RouterProvider router={router} />
      <AnimatePresence>
        {showStartup && (
          <StartupAnimation onComplete={() => setShowStartup(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
