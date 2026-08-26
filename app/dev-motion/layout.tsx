import type { Metadata } from 'next';

/** Ichki sinov sahifasi — qidiruv tizimlariga chiqmasin. */
export const metadata: Metadata = {
  title: 'Motion system — dev',
  robots: { index: false, follow: false },
};

export default function DevMotionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
