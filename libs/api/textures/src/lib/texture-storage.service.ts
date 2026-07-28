import { Injectable } from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

@Injectable()
export class TextureStorageService {
  #localDirectory = join(process.cwd(), '.data', 'textures');
  #r2Config = this.#readR2Config();

  async put(
    objectKey: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    if (!this.#r2Config) {
      await mkdir(this.#localDirectory, { recursive: true });
      await writeFile(join(this.#localDirectory, objectKey), body);
      return;
    }

    const response = await this.#request('PUT', objectKey, body, contentType);
    if (!response.ok) {
      throw new Error(`R2 upload failed with status ${response.status}`);
    }
  }

  async get(objectKey: string): Promise<Buffer> {
    if (!this.#r2Config) {
      return readFile(join(this.#localDirectory, objectKey));
    }

    const response = await this.#request('GET', objectKey);
    if (!response.ok) {
      throw new Error(`R2 download failed with status ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async #request(
    method: 'GET' | 'PUT',
    objectKey: string,
    body?: Buffer,
    contentType?: string,
  ): Promise<Response> {
    const config = this.#r2Config;
    if (!config) throw new Error('R2 is not configured');

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash('sha256')
      .update(body ?? '')
      .digest('hex');
    const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');
    const canonicalUri = `/${config.bucket}/${encodedKey}`;
    const host = new URL(config.endpoint).host;
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
    const scope = `${dateStamp}/auto/s3/aws4_request`;
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

    return fetch(`${config.endpoint}${canonicalUri}`, {
      method,
      headers,
      body,
    });
  }

  #signingKey(secret: string, dateStamp: string): Buffer {
    const date = createHmac('sha256', `AWS4${secret}`)
      .update(dateStamp)
      .digest();
    const region = createHmac('sha256', date).update('auto').digest();
    const service = createHmac('sha256', region).update('s3').digest();
    return createHmac('sha256', service).update('aws4_request').digest();
  }

  #readR2Config(): R2Config | null {
    const accountId = process.env['R2_ACCOUNT_ID'];
    const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
    const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];
    const bucket = process.env['R2_BUCKET'];
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

    return {
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      accessKeyId,
      secretAccessKey,
      bucket,
    };
  }
}
