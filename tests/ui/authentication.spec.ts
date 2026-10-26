import { expect, test } from '../../src/fixtures/test.ts';
import { reportMetadata } from '../../src/reporting/report-metadata.ts';

const metadata = reportMetadata({
  layer: 'ui',
  epic: 'Shopper accounts',
  feature: 'Signup and login',
});

test.describe('Authentication', { annotation: metadata }, () => {
  test(
    'Verify the signup form and check the user details with api call',
    {
      tag: '@smoke',
      annotation: reportMetadata({ severity: 'critical' }),
    },
    async ({ loginPage, signupPage, accountCreatedPage, header, api, newUser }) => {
      await loginPage.goto();
      await loginPage.startSignup(newUser.name, newUser.email);
      await expect(signupPage.heading).toBeVisible();

      await signupPage.completeRegistration(newUser);
      await expect(accountCreatedPage.heading).toBeVisible();

      await accountCreatedPage.continue();
      await expect(header.loggedInBanner).toHaveText(`Logged in as ${newUser.name}`);

      // The backend must hold exactly what the shopper entered in the UI.
      const stored = await api.getUserDetailByEmail(newUser.email);
      expect(stored).toMatchObject({
        name: newUser.name,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        address1: newUser.address.address1,
        city: newUser.address.city,
        country: newUser.address.country,
      });
    },
  );

  test(
    'logs in an existing shopper and logs out again',
    {
      annotation: reportMetadata({ severity: 'critical' }),
    },
    async ({ loginPage, header, registeredUser }) => {
      await loginPage.goto();
      await loginPage.login(registeredUser);
      await expect(header.loggedInBanner).toHaveText(`Logged in as ${registeredUser.name}`);

      await header.logout();
      await expect(header.loggedInBanner).toBeHidden();
      await expect(loginPage.signupHeading).toBeVisible();
    },
  );

  test(
    'rejects a login with the wrong password',
    {
      annotation: reportMetadata({ severity: 'normal' }),
    },
    async ({ loginPage, header, registeredUser }) => {
      await loginPage.goto();
      await loginPage.login({
        email: registeredUser.email,
        password: `${registeredUser.password}-wrong`,
      });

      await expect(loginPage.loginError).toBeVisible();
      await expect(header.loggedInBanner).toBeHidden();
    },
  );
});
