export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface ObjectStorage {
  put(input: PutObjectInput): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
