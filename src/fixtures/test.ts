import { test as base, expect } from '@playwright/test';
import { ApiTransport } from '../api/api-transport.ts';
import { AutomationExerciseApi } from '../api/automation-exercise-api.ts';
import { env } from '../config/env.ts';
import { buildUser, type UserAccount } from '../data/user-factory.ts';
import { AccountCreatedPage } from '../pages/account-created-page.ts';
import { CartPage } from '../pages/cart-page.ts';
import { CheckoutPage } from '../pages/checkout-page.ts';
import { SiteHeader } from '../pages/components/site-header.ts';
import { HomePage } from '../pages/home-page.ts';
import { LoginPage } from '../pages/login-page.ts';
import { OrderPlacedPage } from '../pages/order-placed-page.ts';
import { PaymentPage } from '../pages/payment-page.ts';
import { ProductDetailsPage } from '../pages/product-details-page.ts';
import { ProductsPage } from '../pages/products-page.ts';
import { SignupPage } from '../pages/signup-page.ts';

export interface PageFixtures {
  header: SiteHeader;
  homePage: HomePage;
  loginPage: LoginPage;
  signupPage: SignupPage;
  accountCreatedPage: AccountCreatedPage;
  productsPage: ProductsPage;
  productDetailsPage: ProductDetailsPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  paymentPage: PaymentPage;
  orderPlacedPage: OrderPlacedPage;
}

export interface ApiFixtures {
  api: AutomationExerciseApi;
}

export interface DataFixtures {
  /** Unique user that does NOT exist yet. Deleted after the test if the test registered it. */
  newUser: UserAccount;
  /** Unique user already registered through the API. Deleted after the test. */
  registeredUser: UserAccount;
}

/** Ad and consent hosts injected by the public site; they add overlays and latency. */
const THIRD_PARTY_AD_HOSTS =
  /^https?:\/\/([^/]+\.)?(googlesyndication\.com|doubleclick\.net|googleadservices\.com|googletagservices\.com|adservice\.google\.[^/]+|fundingchoicesmessages\.google\.com)\//;

export const test = base.extend<PageFixtures & ApiFixtures & DataFixtures>({
  context: async ({ context }, use) => {
    if (env.blockThirdPartyAds) {
      await context.route(THIRD_PARTY_AD_HOSTS, (route) => route.abort('blockedbyclient'));
    }
    await use(context);
  },

  header: async ({ page }, use) => use(new SiteHeader(page)),
  homePage: async ({ page }, use) => use(new HomePage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  signupPage: async ({ page }, use) => use(new SignupPage(page)),
  accountCreatedPage: async ({ page }, use) => use(new AccountCreatedPage(page)),
  productsPage: async ({ page }, use) => use(new ProductsPage(page)),
  productDetailsPage: async ({ page }, use) => use(new ProductDetailsPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  paymentPage: async ({ page }, use) => use(new PaymentPage(page)),
  orderPlacedPage: async ({ page }, use) => use(new OrderPlacedPage(page)),

  api: async ({ request }, use) => use(new AutomationExerciseApi(new ApiTransport(request))),

  newUser: async ({ api }, use) => {
    const user = buildUser();
    await use(user);
    await api.deleteAccountIfExists(user);
  },

  registeredUser: async ({ api }, use) => {
    const user = buildUser();
    await api.createAccount(user);
    await use(user);
    await api.deleteAccountIfExists(user);
  },
});

export { expect };
