/// <reference types="vite/client" />
/// <reference lib="webworker" />
/// <reference types="unplugin-icons/types/react" />

interface ImportMetaEnv {
  readonly WXT_SOURCE_CONNECTION_WS_URL?: string
}

declare module "*.svg?url&raw" {
  const content: string
  export default content
}
