import { expect, test } from '../../src/fixtures/test.ts';
import { reportMetadata } from '../../src/reporting/report-metadata.ts';

const metadata = reportMetadata({ layer: 'api', epic: 'Shopper accounts', feature: 'Account API' });

test.describe('Account API', { annotation: metadata }, () => {
  test(
    'account lifecycle: create, verify login, read details, delete',
    {
      tag: '@smoke',
      annotation: reportMetadata({ severity: 'critical' }),
    },
    async ({ api, newUser }) => {
      const created = await api.createAccount(newUser);
      expect(created).toEqual({ responseCode: 201, message: 'User created!' });

      expect(await api.verifyLogin(newUser)).toEqual({
        responseCode: 200,
        message: 'User exists!',
      });

      const stored = await api.getUserDetailByEmail(newUser.email);
      expect(stored).toMatchObject({
        email: newUser.email,
        name: newUser.name,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        city: newUser.address.city,
        zipcode: newUser.address.zipcode,
      });

      expect(await api.deleteAccount(newUser)).toEqual({
        responseCode: 200,
        message: 'Account deleted!',
      });
      expect(await api.verifyLogin(newUser)).toEqual({
        responseCode: 404,
        message: 'User not found!',
      });
    },
  );

  test(
    'verifyLogin rejects an existing email with the wrong password',
    {
      annotation: reportMetadata({ severity: 'normal' }),
    },
    async ({ api, registeredUser }) => {
      const response = await api.verifyLogin({
        email: registeredUser.email,
        password: `${registeredUser.password}-wrong`,
      });

      expect(response).toEqual({ responseCode: 404, message: 'User not found!' });
    },
  );
});
