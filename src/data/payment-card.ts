export interface PaymentCard {
  readonly nameOnCard: string;
  readonly number: string;
  readonly cvc: string;
  readonly expiryMonth: string;
  readonly expiryYear: string;
}

/**
 * The practice site accepts any well-formed card and charges nothing.
 * 4111 1111 1111 1111 is the industry-standard Visa test number.
 */
export function buildTestCard(
  nameOnCard: string,
  overrides: Partial<PaymentCard> = {},
): PaymentCard {
  return {
    nameOnCard,
    number: '4111111111111111',
    cvc: '123',
    expiryMonth: '12',
    expiryYear: String(new Date().getFullYear() + 3),
    ...overrides,
  };
}
