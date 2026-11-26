/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_WS_URL?: string;
    readonly VITE_APP_NAME?: string;
    readonly VITE_STRIP_AI_GREETING?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
