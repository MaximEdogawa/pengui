'use client'

import { useEffect, useRef, useState } from 'react'
import type { OrderBookOrder } from '../lib/orderBookTypes'

const MAX_VISIBLE_ORDERS = 50
const SCROLL_DEBOUNCE_MS = 300

/**
 * Hook to detect which orders are visible in the viewport
 * Tracks visible order IDs for both sell and buy sections combined
 * Debounces scroll events to avoid excessive updates
 */
export function useOrderBookViewport(
  sellOrders: OrderBookOrder[],
  buyOrders: OrderBookOrder[],
  sellScrollRef: React.RefObject<HTMLDivElement | null>,
  buyScrollRef: React.RefObject<HTMLDivElement | null>
) {
  const [visibleOrderIds, setVisibleOrderIds] = useState<Set<string>>(new Set())
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const orderElementRefs = useRef<Map<string, HTMLElement>>(new Map())
  // Persistent Set to track all visible orders across intersection changes
  const visibleIdsRef = useRef<Set<string>>(new Set())

  // Create intersection observer
  useEffect(() => {
    if (!sellScrollRef.current && !buyScrollRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Debounce scroll detection
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }

        scrollTimeoutRef.current = setTimeout(() => {
          // Update the persistent Set based on intersection state changes
          entries.forEach((entry) => {
            const orderId = entry.target.getAttribute('data-order-id')
            if (orderId) {
              if (entry.isIntersecting) {
                visibleIdsRef.current.add(orderId)
              } else {
                visibleIdsRef.current.delete(orderId)
              }
            }
          })

          // Create a new Set from the ref to trigger state update
          const updatedVisibleIds = new Set(visibleIdsRef.current)

          // Limit to max 50 visible orders
          if (updatedVisibleIds.size > MAX_VISIBLE_ORDERS) {
            const limitedIds = Array.from(updatedVisibleIds).slice(0, MAX_VISIBLE_ORDERS)
            setVisibleOrderIds(new Set(limitedIds))
            // Update ref to match the limited set
            visibleIdsRef.current = new Set(limitedIds)
          } else {
            setVisibleOrderIds(updatedVisibleIds)
          }
        }, SCROLL_DEBOUNCE_MS)
      },
      {
        root: null, // Use viewport as root
        rootMargin: '50px', // Start loading slightly before visible
        threshold: 0.1, // Trigger when 10% visible
      }
    )

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [sellScrollRef, buyScrollRef])

  // Clean up visible IDs when orders are removed from lists
  useEffect(() => {
    const allOrderIds = new Set([
      ...sellOrders.map((order) => order.id),
      ...buyOrders.map((order) => order.id),
    ])

    // Track if any IDs were removed
    let hasRemovedIds = false

    // Remove IDs from visible set that are no longer in the order lists
    visibleIdsRef.current.forEach((orderId) => {
      if (!allOrderIds.has(orderId)) {
        visibleIdsRef.current.delete(orderId)
        hasRemovedIds = true
      }
    })

    // Update state only if IDs were removed
    if (hasRemovedIds) {
      const updatedVisibleIds = new Set(visibleIdsRef.current)
      if (updatedVisibleIds.size > MAX_VISIBLE_ORDERS) {
        const limitedIds = Array.from(updatedVisibleIds).slice(0, MAX_VISIBLE_ORDERS)
        setVisibleOrderIds(new Set(limitedIds))
        visibleIdsRef.current = new Set(limitedIds)
      } else {
        setVisibleOrderIds(updatedVisibleIds)
      }
    }
  }, [sellOrders, buyOrders])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Register order element refs
  const registerOrderElement = (orderId: string, element: HTMLElement | null) => {
    if (element) {
      element.setAttribute('data-order-id', orderId)
      orderElementRefs.current.set(orderId, element)
      observerRef.current?.observe(element)
    } else {
      const existingElement = orderElementRefs.current.get(orderId)
      if (existingElement) {
        observerRef.current?.unobserve(existingElement)
        orderElementRefs.current.delete(orderId)
        // Remove from visible set when element is unregistered
        visibleIdsRef.current.delete(orderId)
      }
    }
  }

  return {
    visibleOrderIds: Array.from(visibleOrderIds),
    registerOrderElement,
  }
}
