export {};

declare global {
  var __TEARDOWN_MESSAGE__: string | undefined;

  interface Global {
    __TEARDOWN_MESSAGE__?: string;
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      HOST?: string;
      API_URL: string;
    }
  }
}
