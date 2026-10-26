import { ApiContractError, type ApiEnvelope } from './api-transport.ts';

export interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: string;
  readonly brand: string;
  readonly category: {
    readonly usertype: string;
    readonly category: string;
  };
}

export interface ApiMessage {
  readonly responseCode: number;
  readonly message: string;
}

/** Subset of GET /api/getUserDetailByEmail that the tests rely on. */
export interface UserDetail {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly address1: string;
  readonly city: string;
  readonly country: string;
  readonly zipcode: string;
}

type JsonObject = Readonly<Record<string, unknown>>;

class Reader {
  private readonly operation: string;

  constructor(operation: string) {
    this.operation = operation;
  }

  object(value: unknown, path: string): JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw this.error(path, 'an object', value);
    }
    return value as JsonObject;
  }

  array(value: unknown, path: string): readonly unknown[] {
    if (!Array.isArray(value)) throw this.error(path, 'an array', value);
    return value;
  }

  string(source: JsonObject, key: string, path: string): string {
    const value = source[key];
    if (typeof value !== 'string') throw this.error(`${path}.${key}`, 'a string', value);
    return value;
  }

  number(source: JsonObject, key: string, path: string): number {
    const value = source[key];
    if (typeof value !== 'number') throw this.error(`${path}.${key}`, 'a number', value);
    return value;
  }

  private error(path: string, expected: string, actual: unknown): ApiContractError {
    return new ApiContractError(
      `${this.operation}: expected ${path} to be ${expected}, received ${JSON.stringify(actual)}`,
    );
  }
}

export function parseProducts(envelope: ApiEnvelope): Product[] {
  const read = new Reader(envelope.operation);
  return read.array(envelope.body['products'], 'products').map((item, index) => {
    const path = `products[${index}]`;
    const product = read.object(item, path);
    const category = read.object(product['category'], `${path}.category`);
    const usertype = read.object(category['usertype'], `${path}.category.usertype`);
    return {
      id: read.number(product, 'id', path),
      name: read.string(product, 'name', path),
      price: read.string(product, 'price', path),
      brand: read.string(product, 'brand', path),
      category: {
        usertype: read.string(usertype, 'usertype', `${path}.category.usertype`),
        category: read.string(category, 'category', `${path}.category`),
      },
    };
  });
}

export function parseMessage(envelope: ApiEnvelope): ApiMessage {
  const read = new Reader(envelope.operation);
  return {
    responseCode: envelope.responseCode,
    message: read.string(envelope.body, 'message', 'body'),
  };
}

export function parseUserDetail(envelope: ApiEnvelope): UserDetail {
  const read = new Reader(envelope.operation);
  const user = read.object(envelope.body['user'], 'user');
  return {
    id: read.number(user, 'id', 'user'),
    name: read.string(user, 'name', 'user'),
    email: read.string(user, 'email', 'user'),
    firstName: read.string(user, 'first_name', 'user'),
    lastName: read.string(user, 'last_name', 'user'),
    address1: read.string(user, 'address1', 'user'),
    city: read.string(user, 'city', 'user'),
    country: read.string(user, 'country', 'user'),
    zipcode: read.string(user, 'zipcode', 'user'),
  };
}
