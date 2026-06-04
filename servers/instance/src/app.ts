import type { NewsNextDataInstance } from "./types"
import { SourceServiceError } from "./errors"

export interface LoadSourceBody {
  params?: Record<string, unknown>
  paramsAreNormalized?: boolean
}

export async function listInstanceSources(instance: NewsNextDataInstance): Promise<Response> {
  return jsonResponse(success(await instance.listSourceDescriptors()))
}

export async function loadInstanceSource(
  instance: NewsNextDataInstance,
  sourceId: string,
  body: LoadSourceBody,
): Promise<Response> {
  try {
    const result = await instance.loadSource({
      sourceId,
      params: body.params ?? {},
      paramsAreNormalized: body.paramsAreNormalized,
    })

    return jsonResponse(success(result))
  } catch (error) {
    if (error instanceof SourceServiceError) {
      const status = error.code === "PROVIDER_NOT_FOUND" || error.code === "SOURCE_NOT_FOUND"
        ? 404
        : 400
      return jsonResponse(failure(error.code, error.message), status)
    }

    const err = error as Error
    console.error(`Error loading source ${sourceId}:`, err)
    return jsonResponse(failure("INTERNAL_ERROR", err.message || "Internal Server Error"), 500)
  }
}

function success<T>(data: T) {
  return {
    success: true as const,
    data,
  }
}

function failure(code: string, message: string) {
  return {
    success: false as const,
    error: {
      code,
      message,
    },
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  })
}
