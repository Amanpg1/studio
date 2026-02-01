import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Timestamp } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | Timestamp | undefined | null): string {
  if (!date) {
    return 'N/A';
  }
  if (date instanceof Date) {
    return date.toLocaleDateString();
  }
  // It's a Timestamp, which has a toDate() method
  return date.toDate().toLocaleDateString();
}
