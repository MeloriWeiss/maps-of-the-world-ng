/** Параметры подключения к S3-совместимому хранилищу. */
export interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}
