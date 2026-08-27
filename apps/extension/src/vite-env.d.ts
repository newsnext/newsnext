/// <reference types="vite/client" />
/// <reference lib="webworker" />
/// <reference types="unplugin-icons/types/react" />

interface ImportMetaEnv {
  readonly WXT_ENABLE_REACT_SCAN?: string
  readonly WXT_YOLO_MODE?: string
}

declare module "*.svg?url&raw" {
  const content: string
  export default content
}
