import { NOW } from "../data/mock";

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

export function hoursFromNow(iso: string) {
  return (new Date(iso).getTime() - NOW.getTime()) / 3600_000;
}

export function relative(iso: string) {
  const hrs = hoursFromNow(iso);
  const abs = Math.abs(hrs);
  let text: string;
  if (abs < 1) text = `${Math.max(1, Math.round(abs * 60))}m`;
  else if (abs < 48) text = `${Math.round(abs)}h`;
  else text = `${Math.round(abs / 24)}d`;
  return hrs < 0 ? `${text} ago` : `in ${text}`;
}

export function durationHours(fromIso: string, toIso: string) {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 3600_000);
}
