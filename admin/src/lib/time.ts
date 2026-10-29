const TZ = "Asia/Kolkata";

/** "1 Jan, 10:00 am": no weekday, 12-hour clock, so 48 hours is easy to count. */
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ }).toLowerCase().replace(/\s+/g, " ");
  return `${day}, ${time}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
}

export function formatToday() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).replace(",", "");
}

export function hoursFromNow(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / 3600_000;
}

export function relative(iso: string) {
  const hrs = hoursFromNow(iso);
  const abs = Math.abs(hrs);
  if (abs < 1 / 60) return "just now";
  let text: string;
  if (abs < 1) text = `${Math.max(1, Math.round(abs * 60))}m`;
  else if (abs < 48) text = `${Math.round(abs)}h`;
  else text = `${Math.round(abs / 24)}d`;
  return hrs < 0 ? `${text} ago` : `in ${text}`;
}

export function durationHours(fromIso: string, toIso: string) {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 3600_000);
}
