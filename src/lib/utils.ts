import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// class নামগুলো জোড়া দেয়, দ্বন্দ্ব হলে শেষেরটা জেতে
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}