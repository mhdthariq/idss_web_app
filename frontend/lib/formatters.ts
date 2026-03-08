export function fmtRupiah(value: number): string {
  if (value == null || Number.isNaN(Number(value))) return "–";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function fmtPercent(value: number, decimals = 1): string {
  if (value == null || Number.isNaN(Number(value))) return "–";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function fmtFloat(value: number, decimals = 4): string {
  if (value == null || Number.isNaN(Number(value))) return "–";
  return Number(value).toFixed(decimals);
}

export function fmtNumber(value: number): string {
  if (value == null || Number.isNaN(Number(value))) return "–";
  return new Intl.NumberFormat("id-ID").format(value);
}
