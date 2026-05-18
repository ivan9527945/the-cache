'use client';

import { useAutoCleanup } from '../lib/useAutoCleanup';

export default function AutoCleanupBoundary(): null {
  useAutoCleanup();
  return null;
}
