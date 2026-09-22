import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind sinflarini birlashtiradi.
 *
 * `twMerge` ziddiyatli sinflarni hal qiladi: `px-4` va `px-6` birga
 * kelsa, oxirgisi qoladi. Busiz komponentga tashqaridan berilgan sinf
 * ichkaridagini bosa olmasdi — CSS tartibi sinf tartibiga bog'liq emas.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
