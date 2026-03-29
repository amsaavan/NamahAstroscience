export const DEFAULT_SLOT = "Standard";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type BookingRecord = {
  fullName: string;
  email: string;
  whatsapp: string;
  notes: string;
  date: string;
  slot: string;
  createdAt: string;
  feesPaid: boolean;
  // Birth details (optional — for Kundali)
  birthDate?: string;  // YYYY-MM-DD
  birthTime?: string;  // HH:MM
  birthPlace?: string; // City / Town
  completed?: boolean;
};

export type BookingsByDate = Record<string, Record<string, BookingRecord>>;

export const isValidDate = (value: string) => DATE_RE.test(value);

export const isValidSlot = (value: string) => value === DEFAULT_SLOT || value.length > 0;

