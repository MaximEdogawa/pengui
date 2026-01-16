/**
 * Helper functions for Dexie API requests
 * Extracted to reduce complexity and improve maintainability
 */

import { logger } from '@/shared/lib/logger'

/**
 * Build query parameters for offer search
 */
export function buildOfferSearchParams(params: {
  requested?: string
  offered?: string
  maker?: string
  page_size?: number
  page?: number
  status?: number
}): URLSearchParams {
  const queryParams = new URLSearchParams()

  if (params.requested) queryParams.append('requested', params.requested)
  if (params.offered) queryParams.append('offered', params.offered)
  if (params.maker) queryParams.append('maker', params.maker)
  if (params.page_size) queryParams.append('page_size', params.page_size.toString())
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.status !== undefined) queryParams.append('status', params.status.toString())

  return queryParams
}

/**
 * Extract error message from HTTP response
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  let errorMessage = `HTTP error! status: ${response.status}`
  const responseText = await response.text()

  if (responseText) {
    try {
      const errorData = JSON.parse(responseText)
      if (errorData.message || errorData.error) {
        errorMessage = `${errorMessage}: ${errorData.message || errorData.error}`
      } else {
        errorMessage = `${errorMessage}: ${responseText}`
      }
    } catch {
      errorMessage = `${errorMessage}: ${responseText}`
    }
  }

  return errorMessage
}

/**
 * Parse offers data from various response structures
 */
export function parseOffersData(data: unknown): {
  offers: unknown[]
  total: number
  page: number
  page_size: number
} {
  let offersData: unknown[] = []

  if (Array.isArray(data)) {
    offersData = data
  } else if (data && typeof data === 'object') {
    if (Array.isArray((data as { data?: unknown[] }).data)) {
      offersData = (data as { data: unknown[] }).data
    } else if (Array.isArray((data as { offers?: unknown[] }).offers)) {
      offersData = (data as { offers: unknown[] }).offers
    } else if (Array.isArray((data as { results?: unknown[] }).results)) {
      offersData = (data as { results: unknown[] }).results
    }
  }

  const typedData = data as { total?: number; page?: number; page_size?: number }
  return {
    offers: offersData,
    total: typedData.total || offersData.length,
    page: typedData.page || 1,
    page_size: typedData.page_size || 10,
  }
}

/**
 * Log API error with context
 */
export function logApiError(
  operation: string,
  url: string,
  status: number,
  errorMessage: string
): void {
  logger.error('Dexie API error:', {
    operation,
    status,
    url,
    error: errorMessage,
  })
}
