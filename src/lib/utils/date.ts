const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

function toDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input);
}

/**
 * Formats a date as a relative time string.
 * Returns "just now", "X minutes ago", "X hours ago", "X days ago",
 * or a formatted date string for dates older than 30 days.
 */
export function formatRelativeDate(date: Date | string): string {
  const d = toDate(date);
  const now = Date.now();
  const diffSeconds = Math.floor((now - d.getTime()) / 1000);

  if (diffSeconds < MINUTE) {
    return "just now";
  }

  if (diffSeconds < HOUR) {
    const minutes = Math.floor(diffSeconds / MINUTE);
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }

  if (diffSeconds < DAY) {
    const hours = Math.floor(diffSeconds / HOUR);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  if (diffSeconds < DAY * 30) {
    const days = Math.floor(diffSeconds / DAY);
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  return formatDate(d);
}

/**
 * Formats a date as "Mon DD, YYYY" (e.g., "Jan 15, 2025").
 */
export function formatDate(date: Date | string): string {
  const d = toDate(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
