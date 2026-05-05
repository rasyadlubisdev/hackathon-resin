import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID").format(Math.round(n));

export const fmtRp = (n: number) =>
  "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n));
