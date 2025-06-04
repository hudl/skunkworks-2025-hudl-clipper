/// <reference types='vite/client' />
/// <reference types='vite/types/importMeta.d.ts' />

interface ImportMetaEnv {
  readonly VITE_FASTMODEL_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}