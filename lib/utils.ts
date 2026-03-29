import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "éppen most";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} perce`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} órája`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} napja`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} hete`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} hónapja`;

  const years = Math.floor(days / 365);
  return `${years} éve`;
}
