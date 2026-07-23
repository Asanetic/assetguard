'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false });

export default function TopLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Start loader when pathname changes
    setLoading(true);
    NProgress.start();

    const timer = setTimeout(() => {
      NProgress.done();
      setLoading(false);
    }, 500); // Adjust this time as needed

    return () => {
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}

