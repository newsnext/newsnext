/// <reference types="vite/client" />
/// <reference lib="webworker" />
/// <reference types="unplugin-icons/types/react" />
/// <reference types="unplugin-fonts/client" />

declare module "*.svg?url&raw" {
  const content: string
  export default content
}