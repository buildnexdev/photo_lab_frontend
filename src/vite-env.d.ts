// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_MAX_UPLOAD_MB?: string;
    readonly VITE_DEV_API_TARGET?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
