import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAvatarUrl(url: string | null | undefined) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;

  const baseUrl = import.meta.env.VITE_BASE_API_URL || 'localhost:8000';
  // If baseUrl doesn't have protocol, add it.
  const protocol = window.location.protocol; // http: or https:
  // Remove trailing slash if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  const host = cleanBaseUrl.startsWith('http') 
    ? cleanBaseUrl 
    : `${protocol}//${cleanBaseUrl}`;

  // Ensure url starts with /
  const path = url.startsWith('/') ? url : `/${url}`;

  return `${host}${path}`;
}
