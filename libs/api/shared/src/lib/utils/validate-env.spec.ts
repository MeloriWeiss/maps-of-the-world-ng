import { validateEnv } from './validate-env';

const validConfig = {
  NODE_ENV: 'production',
  MAIN_API_PORT: '3000',
  MAIN_DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_ACCESS_EXPIRES: '15m',
  JWT_REFRESH_EXPIRES: '30d',
  OBJECT_STORAGE_ENDPOINT: 'http://minio:9000',
  OBJECT_STORAGE_REGION: 'us-east-1',
  OBJECT_STORAGE_BUCKET: 'bucket',
  OBJECT_STORAGE_ACCESS_KEY: 'access-key',
  OBJECT_STORAGE_SECRET_KEY: 'secret-key',
  OBJECT_STORAGE_FORCE_PATH_STYLE: 'true',
};

describe('validateEnv', () => {
  it('accepts API configuration without development infrastructure variables', () => {
    expect(validateEnv(validConfig)).toBe(validConfig);
  });

  it('requires the database connection URL', () => {
    const config = { ...validConfig, MAIN_DATABASE_URL: undefined };

    expect(() => validateEnv(config)).toThrow('MAIN_DATABASE_URL is required');
  });
});
