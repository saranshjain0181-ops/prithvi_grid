export function cn(...inputs: any[]) {
  return inputs.flat().filter(Boolean).join(' ');
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('hi-IN', options).format(
    typeof date === 'string' ? new Date(date) : date
  );
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'अभी';
  if (diffMins < 60) return `${diffMins} मिनट पहले`;
  if (diffHours < 24) return `${diffHours} घंटे पहले`;
  return `${diffDays} दिन पहले`;
}
