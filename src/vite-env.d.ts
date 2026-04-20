/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_CONNECTION_DETAILS_PATH?: string;
  readonly VITE_DEV_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
