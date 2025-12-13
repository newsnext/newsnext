import process from "node:process"

export const isDev = process.env.NODE_ENV === "development"
export const isCF = process.env.CF === "1"
