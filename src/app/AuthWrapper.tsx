'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

// Define the public and private routes
const publicRoutes = ['/']; // The login page
const privateRoutes = ['/dashboard']; // The wishlist page

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This function from Firebase listens for changes in the user's login state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Don't redirect until we're done loading the user's state
    if (loading) return;

    // If the user is logged out and trying to access a private page, redirect to login
    if (!user && privateRoutes.includes(pathname)) {
      router.push('/');
    }

    // If the user is logged in and on the login page, redirect to the dashboard
    if (user && publicRoutes.includes(pathname)) {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  // While we are checking for the user, we can show a loading screen
  if (loading) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    )
  }

  // If the user's state is loaded, show the page's content
  return <>{children}</>;
}