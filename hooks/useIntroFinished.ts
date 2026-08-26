'use client';

import { useSyncExternalStore } from 'react';
import { introStore } from '@/lib/intro-store';

/** Loader tugadimi — Hero animatsiyasi shundan keyin boshlanadi. */
export function useIntroFinished(): boolean {
  return useSyncExternalStore(
    introStore.subscribe,
    introStore.getSnapshot,
    introStore.getServerSnapshot,
  );
}
