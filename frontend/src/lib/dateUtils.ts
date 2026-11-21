/**
 * Universal Date and Time formatting utilities for the application.
 * Standard format: dd-mm-yyyy for dates, dd-mm-yyyy HH:MM for datetimes, HH:MM for times.
 */

/**
 * Format a date string, timestamp, or Date object into `dd-mm-yyyy`.
 */
export const formatDate = (
  dateInput?: string | number | Date | null,
  fallback = '—'
): string => {
  if (!dateInput) return fallback;

  if (typeof dateInput === 'string') {
    const str = dateInput.trim();
    if (!str) return fallback;

    // Direct match for YYYY-MM-DD or YYYY-MM-DDTHH... to avoid timezone shift
    const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return `${day}-${month}-${year}`;
    }

    // Already in dd-mm-yyyy or dd/mm/yyyy
    const dmyMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      return `${day}-${month}-${year}`;
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Format a datetime string, timestamp, or Date object into `dd-mm-yyyy HH:mm`.
 */
export const formatDateTime = (
  dateTimeInput?: string | number | Date | null,
  fallback = '—'
): string => {
  if (!dateTimeInput) return fallback;

  const d = new Date(dateTimeInput);
  if (isNaN(d.getTime())) {
    if (typeof dateTimeInput === 'string') {
      const match = dateTimeInput.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, day, hours, minutes] = match;
        return `${day}-${month}-${year} ${hours}:${minutes}`;
      }
    }
    return String(dateTimeInput);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

/**
 * Format a time string or datetime into `HH:mm` (24-hour).
 */
export const formatTime = (
  timeInput?: string | number | Date | null,
  fallback = '—'
): string => {
  if (!timeInput) return fallback;

  if (typeof timeInput === 'string') {
    const str = timeInput.trim();
    if (!str) return fallback;

    // HH:mm or HH:mm:ss without date
    const timeMatch = str.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch && !str.includes('-') && !str.includes('T')) {
      const [, h, m] = timeMatch;
      return `${h.padStart(2, '0')}:${m}`;
    }
  }

  const d = new Date(timeInput);
  if (isNaN(d.getTime())) {
    if (typeof timeInput === 'string') {
      const match = timeInput.match(/(\d{2}):(\d{2})/);
      if (match) return `${match[1]}:${match[2]}`;
    }
    return String(timeInput);
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Format a date range into `dd-mm-yyyy to dd-mm-yyyy` or `dd-mm-yyyy → dd-mm-yyyy`.
 */
export const formatDateRange = (
  from?: string | null,
  to?: string | null,
  separator = '→'
): string => {
  if (!from && !to) return '—';
  if (!to || from === to) return formatDate(from);
  if (!from) return formatDate(to);
  return `${formatDate(from)} ${separator} ${formatDate(to)}`;
};
