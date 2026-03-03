export interface EventDateInput {
  date?: string | null;
  time?: string | null;
  startsAt?: string | null;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const parseTimeRangeStart = (value?: string | null): { hours: number; minutes: number } => {
  if (!value) return { hours: 0, minutes: 0 };

  const firstPart = value.split("-")[0]?.trim();
  if (!firstPart) return { hours: 0, minutes: 0 };

  const normalized = firstPart.toUpperCase();
  const amPmMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (amPmMatch) {
    let hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2] ?? 0);
    const period = amPmMatch[3];

    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours < 12) hours += 12;

    return { hours, minutes };
  }

  const twentyFourMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (twentyFourMatch) {
    return {
      hours: Number(twentyFourMatch[1]),
      minutes: Number(twentyFourMatch[2] ?? 0),
    };
  }

  return { hours: 0, minutes: 0 };
};

const parseDateString = (value?: string | null): { year: number; monthIndex: number; day: number } | null => {
  if (!value) return null;

  const directDate = new Date(value);
  if (!Number.isNaN(directDate.getTime())) {
    return {
      year: directDate.getFullYear(),
      monthIndex: directDate.getMonth(),
      day: directDate.getDate(),
    };
  }

  const cleaned = value.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const parts = cleaned.split(" ");
  if (parts.length < 3) return null;

  const [monthRaw, dayRaw, yearRaw] = parts;
  const monthIndex = MONTH_INDEX[monthRaw.toLowerCase()];
  const day = Number(dayRaw);
  const year = Number(yearRaw);

  if (monthIndex === undefined || Number.isNaN(day) || Number.isNaN(year)) return null;
  return { year, monthIndex, day };
};

export const parseEventTimestamp = (input: EventDateInput): number | null => {
  if (input.startsAt) {
    const isoDate = new Date(input.startsAt);
    if (!Number.isNaN(isoDate.getTime())) {
      return isoDate.getTime();
    }
  }

  const parsedDate = parseDateString(input.date);
  if (!parsedDate) return null;

  const { hours, minutes } = parseTimeRangeStart(input.time);
  return new Date(parsedDate.year, parsedDate.monthIndex, parsedDate.day, hours, minutes).getTime();
};

