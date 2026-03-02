/**
 * Shared payment plan calculator.
 * Single source of truth for installment amounts across:
 *   - UI modal preview
 *   - DB persistence (RPC params)
 *   - Thermal ticket / PDF
 */

export interface PaymentPlanInput {
  saleTotal: number;
  downPayment: number;
  numberOfInstallments: number;
  interestRate?: number; // percentage, default 0
}

export interface PaymentPlanCalc {
  financedAmount: number;       // saleTotal - downPayment (+ interest)
  installmentAmount: number;    // base per-installment (rounded down to 2 dec)
  lastInstallmentAmount: number; // adjusted so sum === financedAmount
  installments: number[];       // array of amounts (length = numberOfInstallments)
}

/**
 * Calculate a payment plan ensuring:
 *   sum(installments) === financedAmount  (within ±0.01)
 */
export function calculatePaymentPlan(input: PaymentPlanInput): PaymentPlanCalc {
  const { saleTotal, downPayment, numberOfInstallments, interestRate = 0 } = input;

  const n = Math.max(1, numberOfInstallments);
  let financedAmount = saleTotal - downPayment;
  if (interestRate > 0) {
    financedAmount = financedAmount * (1 + interestRate / 100);
  }
  financedAmount = Math.round(financedAmount * 100) / 100;

  // Base installment rounded DOWN to 2 decimals to avoid over-charging
  const baseAmount = Math.floor((financedAmount / n) * 100) / 100;

  // Distribute: first (n-1) installments get baseAmount, last gets remainder
  const subtotalBase = Math.round(baseAmount * (n - 1) * 100) / 100;
  const lastAmount = Math.round((financedAmount - subtotalBase) * 100) / 100;

  const installments: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    installments.push(baseAmount);
  }
  installments.push(lastAmount);

  // Sanity check
  const sum = installments.reduce((a, b) => a + b, 0);
  const diff = Math.abs(sum - financedAmount);
  if (diff > 0.02) {
    console.error('[PaymentPlanCalc] Sum mismatch!', { sum, financedAmount, diff });
  }

  return {
    financedAmount,
    installmentAmount: baseAmount,
    lastInstallmentAmount: lastAmount,
    installments,
  };
}

/**
 * Validate that a set of installment amounts sums to the expected financed amount.
 */
export function validatePlanIntegrity(installments: number[], financedAmount: number): boolean {
  const sum = installments.reduce((a, b) => a + b, 0);
  return Math.abs(sum - financedAmount) <= 0.01;
}
