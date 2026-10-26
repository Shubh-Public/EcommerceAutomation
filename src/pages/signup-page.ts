import type { Locator, Page } from '@playwright/test';
import type { UserAccount } from '../data/user-factory.ts';

/** /signup: "Enter Account Information" form (step 2 of registration). */
export class SignupPage {
  readonly heading: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Enter Account Information' });
  }

  /** Fills every field from the user model and submits. Name/email are prefilled by step 1. */
  async completeRegistration(user: UserAccount): Promise<void> {
    const { page } = this;
    await page.getByRole('radio', { name: `${user.title}.`, exact: true }).check();
    await page.getByTestId('password').fill(user.password);
    await page.getByTestId('days').selectOption(String(user.birthDate.day));
    await page.getByTestId('months').selectOption(String(user.birthDate.month));
    await page.getByTestId('years').selectOption(String(user.birthDate.year));
    await page.getByTestId('first_name').fill(user.firstName);
    await page.getByTestId('last_name').fill(user.lastName);
    await page.getByTestId('company').fill(user.address.company);
    await page.getByTestId('address').fill(user.address.address1);
    await page.getByTestId('address2').fill(user.address.address2);
    await page.getByTestId('country').selectOption(user.address.country);
    await page.getByTestId('state').fill(user.address.state);
    await page.getByTestId('city').fill(user.address.city);
    await page.getByTestId('zipcode').fill(user.address.zipcode);
    await page.getByTestId('mobile_number').fill(user.mobileNumber);
    await page.getByTestId('create-account').click();
  }
}
