/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin only (no trailing slash, no /api — the client appends
   *  it), e.g. https://backend-xxx.vercel.app. Leave unset in local dev —
   *  the Vite proxy / nginx handle /api. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
