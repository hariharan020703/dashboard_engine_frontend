import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names, with later Tailwind utilities beating earlier ones.
 *
 * `clsx` flattens the conditional forms; `twMerge` resolves the conflicts, so a
 * component's default `px-3` is genuinely replaced by a caller's `px-6` instead
 * of both landing in the class list and the cascade picking by source order.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
