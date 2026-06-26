import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMnt(amount: number): string {
  return new Intl.NumberFormat("mn-MN", {
    style: "currency",
    currency: "MNT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("mn-MN").format(typeof date === "string" ? new Date(date) : date);
}

export const MONGOLIAN_PHONE_REGEX = /^\+976[6-9]\d{7}$/;
