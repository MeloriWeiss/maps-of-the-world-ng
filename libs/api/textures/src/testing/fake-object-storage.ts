import { ObjectStorage, PutObjectInput } from '@wm/api/api-shared';

export class FakeObjectStorage implements ObjectStorage {
  readonly objects = new Map<string, Buffer>();

  put(input: PutObjectInput): Promise<void> {
    this.objects.set(input.key, Buffer.from(input.body));
    return Promise.resolve();
  }

  get(key: string): Promise<Buffer> {
    const object = this.objects.get(key);
    if (!object) return Promise.reject(new Error(`Object not found: ${key}`));

    return Promise.resolve(Buffer.from(object));
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }
}
