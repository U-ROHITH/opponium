const TZ = "Asia/Kolkata";

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
  return `${day.replace(",", "")}, ${time}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).replace(",", "");
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

/** "Replied in 0h" reads oddly, so short replies are shown in minutes. */
export function durationText(fromIso: string, toIso: string) {
  const mins = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000);
  if (mins < 60) return mins <= 1 ? "1 minute" : `${mins} minutes`;
  const h = Math.round(mins / 60);
  return `${h} ${h === 1 ? "hour" : "hours"}`;
}

export function formatPhone(p: string) {
  if (/^\+91\d{10}$/.test(p)) return `+91 ${p.slice(3, 8)} ${p.slice(8)}`;
  return p;
}

export function formatSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
