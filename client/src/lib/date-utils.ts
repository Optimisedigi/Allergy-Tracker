import { format, formatDistanceToNow } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "Australia/Sydney";

/**
 * Format date to Australian timezone with specified format
 */
export function formatAustralianDate(
  date: Date, 
  formatType: "full" | "short" | "relative" = "full"
): string {
  const zonedDate = toZonedTime(date, TIMEZONE);
  
  switch (formatType) {
    case "full":
      return format(zonedDate, "dd MMM yyyy"); // "06 Oct 2025"
    case "short":
      return format(zonedDate, "dd MMM"); // "06 Oct"  
    case "relative":
      return formatDistanceToNow(zonedDate, { addSuffix: true }); // "in 2 days"
    default:
      return format(zonedDate, "dd MMM yyyy");
  }
}

/**
 * Format date and time to Australian timezone
 */
export function formatAustralianDateTime(
  date: Date,
  formatType: "full" | "time" | "date" | "datetime" = "full"
): string {
  const zonedDate = toZonedTime(date, TIMEZONE);
  
  switch (formatType) {
    case "full":
      return format(zonedDate, "dd MMM yyyy, h:mm a"); // "06 Oct 2025, 2:30 PM"
    case "time":
      return format(zonedDate, "HH:mm"); // "14:30" for HTML time input
    case "date":
      return format(zonedDate, "yyyy-MM-dd"); // "2025-10-06" for HTML date input
    case "datetime":
      return format(zonedDate, "yyyy-MM-dd'T'HH:mm"); // "2025-10-06T14:30" for HTML datetime-local input
    default:
      return format(zonedDate, "dd MMM yyyy, h:mm a");
  }
}

/**
 * Convert HTML input values to proper Date object in Australian timezone
 */
export function parseAustralianDateTime(dateString: string, timeString?: string): Date {
  let dateTimeString: string;
  
  if (timeString) {
    dateTimeString = `${dateString}T${timeString}`;
  } else {
    dateTimeString = dateString;
  }
  
  // Parse as if it's in Australian timezone
  const date = new Date(dateTimeString);
  return toZonedTime(date, TIMEZONE);
}

/**
 * Get current date/time in Australian timezone
 */
export function getAustralianNow(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Check if a date is today in Australian timezone
 */
export function isToday(date: Date): boolean {
  const today = toZonedTime(new Date(), TIMEZONE);
  const checkDate = toZonedTime(date, TIMEZONE);
  
  return format(today, "yyyy-MM-dd") === format(checkDate, "yyyy-MM-dd");
}

/**
 * Get relative time description for observation periods
 */
export function getObservationTimeRemaining(endDate: Date): string {
  const now = getAustralianNow();
  const end = toZonedTime(endDate, TIMEZONE);
  
  if (end <= now) {
    return "completed";
  }
  
  return formatDistanceToNow(end, { addSuffix: true });
}
