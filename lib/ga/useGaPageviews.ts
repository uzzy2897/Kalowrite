'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function useGaPageviews() {
  const p = usePathname(),
    q = useSearchParams();
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).gtag) return;
    (window as any).gtag('event', 'page_view', {
      page_location: location.href,
      page_path: p + (q?.toString() ? `?${q}` : ''),
      page_title: document.title,
    });
  }, [p, q]);
}
