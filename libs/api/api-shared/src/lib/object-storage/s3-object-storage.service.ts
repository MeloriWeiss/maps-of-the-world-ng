import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'node:crypto';
import { ObjectStorage, PutObjectInput } from './object-storage.interface';

interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

@Injectable()
export class S3ObjectStorageService implements ObjectStorage {
  readonly #config: S3Config;

  constructor(configService: ConfigService) {
    this.#config = {
      endpoint: this.#withoutTrailingSlash(
        configService.getOrThrow<string>('OBJECT_STORAGE_ENDPOINT'),
      ),
      region: configService.getOrThrow<string>('OBJECT_STORAGE_REGION'),
      accessKeyId: configService.getOrThrow<string>(
        'OBJECT_STORAGE_ACCESS_KEY',
      ),
      secretAccessKey: configService.getOrThrow<string>(
        'OBJECT_STORAGE_SECRET_KEY',
      ),
      bucket: configService.getOrThrow<string>('OBJECT_STORAGE_BUCKET'),
      forcePathStyle:
        configService.getOrThrow<string>('OBJECT_STORAGE_FORCE_PATH_STYLE') ===
        'true',
    };
  }

  async put(input: PutObjectInput): Promise<void> {
    const response = await this.#request(
      'PUT',
      input.key,
      input.body,
      input.contentType,
    );
    if (!response.ok) {
      throw new Error(`S3 upload failed with status ${response.status}`);
    }
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.#request('GET', key);
    if (!response.ok) {
      throw new Error(`S3 download failed with status ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const response = await this.#request('DELETE', key);
    if (!response.ok && response.status !== 404) {
      throw new Error(`S3 delete failed with status ${response.status}`);
    }
  }

  async #request(
    method: 'DELETE' | 'GET' | 'PUT',
    objectKey: string,
    body?: Buffer,
    contentType?: string,
  ): Promise<Response> {
    const config = this.#config;
    const requestUrl = this.#objectUrl(objectKey);

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash('sha256')
      .update(body ?? '')
      .digest('hex');
    const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');
    const canonicalUri = config.forcePathStyle
      ? `/${encodeURIComponent(config.bucket)}/${encodedKey}`
      : `/${encodedKey}`;
    const host = requestUrl.host;
    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
      method,
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');
    const signingKey = this.#signingKey(config.secretAccessKey, dateStamp);
    const signature = createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    const headers: Record<string, string> = {
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };
    if (contentType) headers['content-type'] = contentType;

    // NestJS has no Angular HttpClient; this infrastructure adapter uses Node's
    // native fetch to send the already signed S3 request without another client.
    // eslint-disable-next-line @nx/workspace-no-direct-fetch
    return fetch(requestUrl, {
      method,
      headers,
      body,
    });
  }

  #signingKey(secret: string, dateStamp: string): Buffer {
    const date = createHmac('sha256', `AWS4${secret}`)
      .update(dateStamp)
      .digest();
    const region = createHmac('sha256', date)
      .update(this.#config.region)
      .digest();
    const service = createHmac('sha256', region).update('s3').digest();
    return createHmac('sha256', service).update('aws4_request').digest();
  }

  #objectUrl(objectKey: string): URL {
    const config = this.#config;
    const endpoint = new URL(`${config.endpoint}/`);
    const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');

    if (config.forcePathStyle) {
      endpoint.pathname = `/${encodeURIComponent(config.bucket)}/${encodedKey}`;
      return endpoint;
    }

    endpoint.hostname = `${config.bucket}.${endpoint.hostname}`;
    endpoint.pathname = `/${encodedKey}`;
    return endpoint;
  }

  #withoutTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
  }
}
