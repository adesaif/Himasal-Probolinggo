export function formatDateID(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTimeID(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTimeID(value: string) {
  return `${formatDateID(value)}, ${formatTimeID(value)} WIB`;
}

export function toDatetimeLocalInput(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function formatEventRange(startAt: string, endAt: string | null) {
  if (!endAt) return formatDateTimeID(startAt);

  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    return `${formatDateID(startAt)}, ${formatTimeID(startAt)} - ${formatTimeID(endAt)} WIB`;
  }
  return `${formatDateTimeID(startAt)} - ${formatDateTimeID(endAt)}`;
}
