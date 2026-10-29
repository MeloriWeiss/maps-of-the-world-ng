/** Данные файла и метаданные для загрузки в объектное хранилище. */
export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

/** Контракт загрузки, чтения и удаления объектов. */
export interface ObjectStorage {
  checkAvailability(): Promise<void>;
  put(input: PutObjectInput): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

/** Токен внедрения реализации объектного хранилища. */
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
