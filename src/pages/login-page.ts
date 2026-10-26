import type { Locator, Page } from '@playwright/test';
import type { Credentials } from '../api/automation-exercise-api.ts';

/** /login: hosts both the "Login" and the "New User Signup!" forms. */
export class LoginPage {
  readonly signupHeading: Locator;
  readonly loginError: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.signupHeading = page.getByRole('heading', { name: 'New User Signup!' });
    this.loginError = page.getByText('Your email or password is incorrect!');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  /** Step 1 of registration. Leads to the account information form. */
  async startSignup(name: string, email: string): Promise<void> {
    await this.page.getByTestId('signup-name').fill(name);
    await this.page.getByTestId('signup-email').fill(email);
    await this.page.getByTestId('signup-button').click();
  }

  async login({ email, password }: Credentials): Promise<void> {
    await this.page.getByTestId('login-email').fill(email);
    await this.page.getByTestId('login-password').fill(password);
    await this.page.getByTestId('login-button').click();
  }
}
