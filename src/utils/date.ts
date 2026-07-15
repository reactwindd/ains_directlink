/**
 * Formats a timestamp into a YYYY-MM-DD string.
 */
export function formatDate(date: number): string {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
}

/**
 * Formats a published date string, extracting only the year (first 4 characters).
 */
export function formatPublishedDate(date?: string): string {
    if (!date) return "-";
    return date.slice(0, 4);
}
