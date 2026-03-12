export const DAILY_SLOTS = (() => {
  const slots: string[] = [];
  for (let minutes = 9 * 60; minutes <= 18 * 60; minutes += 60) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
})();

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

export const isValidSlot = (value: string) => DAILY_SLOTS.includes(value);
