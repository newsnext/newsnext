import type { ApiResponse } from "@newsnext/shared/types"

export function success<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  }
}

export function error(code: string, message: string, data: any = null): ApiResponse<any> {
  return {
    success: false,
    data,
    error: {
      code,
      message,
    },
  }
}
