import { ConfigService } from '@nestjs/config';
import { S3ObjectStorageService } from './s3-object-storage.service';

describe('S3ObjectStorageService', () => {
  const config = {
    OBJECT_STORAGE_ENDPOINT: 'http://localhost:9000',
    OBJECT_STORAGE_REGION: 'us-east-1',
    OBJECT_STORAGE_BUCKET: 'textures-dev',
    OBJECT_STORAGE_ACCESS_KEY: 'access-key',
    OBJECT_STORAGE_SECRET_KEY: 'secret-key',
    OBJECT_STORAGE_FORCE_PATH_STYLE: 'true',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uploads an object to a path-style S3 endpoint', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    const service = new S3ObjectStorageService(new ConfigService(config));

    await service.put({
      key: 'account/texture name.png',
      body: Buffer.from('texture'),
      contentType: 'image/png',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      new URL('http://localhost:9000/textures-dev/account/texture%20name.png'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'content-type': 'image/png',
          Authorization: expect.stringContaining('Credential=access-key/'),
        }),
      }),
    );
  });

  it('uses a virtual-hosted endpoint when path style is disabled', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(Buffer.from('texture'), { status: 200 }));
    const service = new S3ObjectStorageService(
      new ConfigService({
        ...config,
        OBJECT_STORAGE_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
        OBJECT_STORAGE_REGION: 'auto',
        OBJECT_STORAGE_FORCE_PATH_STYLE: 'false',
      }),
    );

    await expect(service.get('texture.png')).resolves.toEqual(
      Buffer.from('texture'),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      new URL(
        'https://textures-dev.example.r2.cloudflarestorage.com/texture.png',
      ),
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
