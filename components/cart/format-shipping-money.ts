export function formatShippingMoney(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return 'At checkout';
  if (amount === 0) return 'Free';
  return `$${amount.toFixed(2)}`;
}
