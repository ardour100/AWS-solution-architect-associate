/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute backend base URL (no trailing slash), e.g. https://api.example.com.
   *  Leave unset in local dev — the Vite proxy / nginx handle /api. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
