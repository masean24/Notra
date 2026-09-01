"use client"

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/constants"
import type { ApiResult } from "@/lib/api/response"

function readCsrfCookie(): string | undefined {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`))
  return match?.split("=")[1]
}

export class ApiRequestError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * Client fetch wrapper for the app's own API: attaches the CSRF header from
 * the double-submit cookie and unwraps the { success, data | error } envelope.
 */
export async function apiFetch<T>(
  input: string,
  init: RequestInit = {}
): Promise<T> {
  const csrfToken = readCsrfCookie()
  const headers = new Headers(init.headers)
  headers.set("content-type", "application/json")
  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken)
  }

  const response = await fetch(input, { ...init, headers })
  const body = (await response.json()) as ApiResult<T>

  if (!body.success) {
    throw new ApiRequestError(
      response.status,
      body.error.code,
      body.error.message
    )
  }
  return body.data
}
