const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-CO');

export const formatCurrency = (value: number): string => currencyFormatter.format(value);

export const formatNumber = (value: number): string => numberFormatter.format(value);

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

export const formatPercentage = (value: number, decimals = 1): string =>
  `${value.toFixed(decimals)}%`;

export const formatCompactCurrency = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value);
};

export const getSemaphoreColor = (status: string): string => {
  switch (status) {
    case 'Verde':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Amarillo':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Rojo':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};
