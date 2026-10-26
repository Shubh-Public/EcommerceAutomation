import { randomUUID } from 'node:crypto';

export type Title = 'Mr' | 'Mrs';

/** Countries offered by the signup form's country dropdown. */
export type Country =
  'India' | 'United States' | 'Canada' | 'Australia' | 'Israel' | 'New Zealand' | 'Singapore';

export interface BirthDate {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

export interface Address {
  readonly company: string;
  readonly address1: string;
  readonly address2: string;
  readonly country: Country;
  readonly state: string;
  readonly city: string;
  readonly zipcode: string;
}

/** Domain model of a shopper account. Shared by the UI and API layers. */
export interface UserAccount {
  readonly title: Title;
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly birthDate: BirthDate;
  readonly address: Address;
  readonly mobileNumber: string;
}

export type UserOverrides = Partial<Omit<UserAccount, 'address'>> & {
  readonly address?: Partial<Address>;
};

/**
 * Short unique token. Unique across workers, processes and repeated runs
 * because the public site keeps every account ever created until it is deleted.
 */
export function uniqueToken(): string {
  return randomUUID().replaceAll('-', '').slice(0, 12);
}

/**
 * Builds a valid, unique, disposable shopper. Only identity fields (name,
 * email, password) vary per call; everything else is deterministic so
 * failures are reproducible. Pass overrides for scenario-specific values.
 *
 * Emails use the reserved `example.com` domain (RFC 2606), so no real person
 * can ever receive mail for them.
 */
export function buildUser(overrides: UserOverrides = {}): UserAccount {
  const token = uniqueToken();
  const { address: addressOverrides, ...userOverrides } = overrides;

  return {
    title: 'Mrs',
    name: `QA Shopper ${token}`,
    email: `qa.shopper.${token}@example.com`,
    password: `Pw-${randomUUID()}`,
    firstName: 'Ada',
    lastName: 'Tester',
    birthDate: { day: 14, month: 6, year: 1991 },
    mobileNumber: '9000000001',
    ...userOverrides,
    address: {
      company: 'Example QA Ltd',
      address1: '221 Test Street',
      address2: 'Suite 4',
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      zipcode: '560001',
      ...addressOverrides,
    },
  };
}
