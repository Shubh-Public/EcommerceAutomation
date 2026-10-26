import type { UserAccount } from '../data/user-factory.ts';
import {
  ApiContractError,
  expectResponseCode,
  type ApiTransport,
  type FormFields,
} from './api-transport.ts';
import {
  parseMessage,
  parseProducts,
  parseUserDetail,
  type ApiMessage,
  type Product,
  type UserDetail,
} from './models.ts';

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Business-level client for the endpoints documented at /api_list.
 *
 * Convention: methods with exactly one successful outcome (e.g. listProducts)
 * enforce the expected responseCode and throw ApiContractError otherwise.
 * Methods whose outcome is the thing under test (e.g. verifyLogin, which
 * legitimately returns 200 or 404) return an ApiMessage for the test to assert.
 */
export class AutomationExerciseApi {
  private readonly transport: ApiTransport;

  constructor(transport: ApiTransport) {
    this.transport = transport;
  }

  /** API 1: GET /api/productsList */
  async listProducts(): Promise<Product[]> {
    const envelope = await this.transport.get('/api/productsList');
    expectResponseCode(envelope, 200);
    return parseProducts(envelope);
  }

  /** API 5: POST /api/searchProduct. Matches product name or category. */
  async searchProducts(term: string): Promise<Product[]> {
    const envelope = await this.transport.send('POST', '/api/searchProduct', {
      search_product: term,
    });
    expectResponseCode(envelope, 200);
    return parseProducts(envelope);
  }

  /** API 6: POST /api/searchProduct without the search_product parameter. */
  async searchProductsWithoutTerm(): Promise<ApiMessage> {
    return parseMessage(await this.transport.send('POST', '/api/searchProduct'));
  }

  /** API 7 / 10: POST /api/verifyLogin. 200 "User exists!" or 404 "User not found!". */
  async verifyLogin(credentials: Credentials): Promise<ApiMessage> {
    return parseMessage(
      await this.transport.send('POST', '/api/verifyLogin', toCredentialFields(credentials)),
    );
  }

  /** API 11: POST /api/createAccount. */
  async createAccount(user: UserAccount): Promise<ApiMessage> {
    const envelope = await this.transport.send('POST', '/api/createAccount', toAccountFields(user));
    expectResponseCode(envelope, 201);
    return parseMessage(envelope);
  }

  /** API 14: GET /api/getUserDetailByEmail */
  async getUserDetailByEmail(email: string): Promise<UserDetail> {
    const envelope = await this.transport.get('/api/getUserDetailByEmail', { email });
    expectResponseCode(envelope, 200);
    return parseUserDetail(envelope);
  }

  /** API 12: DELETE /api/deleteAccount */
  async deleteAccount(credentials: Credentials): Promise<ApiMessage> {
    const envelope = await this.transport.send(
      'DELETE',
      '/api/deleteAccount',
      toCredentialFields(credentials),
    );
    expectResponseCode(envelope, 200);
    return parseMessage(envelope);
  }

  /**
   * Idempotent cleanup for fixtures: succeeds when the account was deleted or
   * never existed (404), and throws for anything else so leaks are visible.
   */
  async deleteAccountIfExists(credentials: Credentials): Promise<void> {
    const envelope = await this.transport.send(
      'DELETE',
      '/api/deleteAccount',
      toCredentialFields(credentials),
    );
    if (envelope.responseCode !== 200 && envelope.responseCode !== 404) {
      throw new ApiContractError(
        `Cleanup of ${credentials.email} failed with responseCode ${envelope.responseCode}: ` +
          JSON.stringify(envelope.body),
      );
    }
  }
}

function toCredentialFields({ email, password }: Credentials): FormFields {
  return { email, password };
}

function toAccountFields(user: UserAccount): FormFields {
  return {
    name: user.name,
    email: user.email,
    password: user.password,
    title: user.title,
    birth_date: String(user.birthDate.day),
    birth_month: String(user.birthDate.month),
    birth_year: String(user.birthDate.year),
    firstname: user.firstName,
    lastname: user.lastName,
    company: user.address.company,
    address1: user.address.address1,
    address2: user.address.address2,
    country: user.address.country,
    zipcode: user.address.zipcode,
    state: user.address.state,
    city: user.address.city,
    mobile_number: user.mobileNumber,
  };
}
