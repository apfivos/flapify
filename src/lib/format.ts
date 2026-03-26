export function formatSignedPercent(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }
  const absValue = Math.abs(value).toFixed(digits);
  if (value > 0) {
    return `+${absValue}%`;
  }
  if (value < 0) {
    return `-${absValue}%`;
  }
  return ` ${absValue}%`;
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value).toLocaleString("en-US")}`;
  }
  if (Math.abs(value) >= 100) {
    return `$${value.toFixed(0)}`;
  }
  return `$${value.toFixed(2)}`;
}

export function coerceLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
