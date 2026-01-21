'use client'

import { createContext, useContext, useCallback, useState, ReactNode } from 'react'
import type { OrderBookOrder } from '../lib/orderBookTypes'
import { useOrderBookOfferSubmission } from './useOrderBookOfferSubmission'
import { logger } from '@/shared/lib/logger'

interface SelectedOrderContextType {
  // Selected orders
  selectedOrderForTaking: OrderBookOrder | null
  selectedOrderForMaking: OrderBookOrder | null
  
  // Methods to select orders
  selectOrderForTaking: (order: OrderBookOrder) => Promise<void>
  selectOrderForMaking: (order: OrderBookOrder) => void
  clearSelectedOrders: () => void
  
  // Methods from useOrderBookOfferSubmission
  resetForm: () => void
  useAsTemplate: (order: OrderBookOrder) => void
}

const SelectedOrderContext = createContext<SelectedOrderContextType | undefined>(undefined)

interface SelectedOrderProviderProps {
  children: ReactNode
}

/**
 * Provider for managing selected orders from order book and depth chart
 * Handles loading offers into market and limit tabs
 */
export function SelectedOrderProvider({ children }: SelectedOrderProviderProps) {
  const [selectedOrderForTaking, setSelectedOrderForTaking] = useState<OrderBookOrder | null>(null)
  const [selectedOrderForMaking, setSelectedOrderForMaking] = useState<OrderBookOrder | null>(null)
  
  const { fillFromOrderBook, useAsTemplate: applyAsTemplate, resetForm: resetOfferForm } = useOrderBookOfferSubmission()

  /**
   * Select an order for taking (taker mode)
   * This fills the market tab with the order details
   */
  const selectOrderForTaking = useCallback(
    async (order: OrderBookOrder) => {
      if (!order || !order.id) {
        logger.error('SelectedOrderProvider: Invalid order passed to selectOrderForTaking', order)
        return
      }

      setSelectedOrderForTaking(order)
      setSelectedOrderForMaking(order)
      
      // Fill the form from order book (swaps perspective for taker mode)
      await fillFromOrderBook(order)
    },
    [fillFromOrderBook]
  )

  /**
   * Select an order for making (maker mode)
   * This uses the order as a template for the limit tab
   */
  const selectOrderForMaking = useCallback(
    (order: OrderBookOrder) => {
      if (!order || !order.id) {
        logger.error('SelectedOrderProvider: Invalid order passed to selectOrderForMaking', order)
        return
      }

      setSelectedOrderForMaking(order)
      applyAsTemplate(order)
    },
    [applyAsTemplate]
  )

  /**
   * Clear all selected orders and reset forms
   */
  const clearSelectedOrders = useCallback(() => {
    setSelectedOrderForTaking(null)
    setSelectedOrderForMaking(null)
    resetOfferForm()
  }, [resetOfferForm])

  const value: SelectedOrderContextType = {
    selectedOrderForTaking,
    selectedOrderForMaking,
    selectOrderForTaking,
    selectOrderForMaking,
    clearSelectedOrders,
    resetForm: resetOfferForm,
    useAsTemplate: applyAsTemplate,
  }

  return <SelectedOrderContext.Provider value={value}>{children}</SelectedOrderContext.Provider>
}

/**
 * Hook to access the selected order context
 */
export function useSelectedOrder(): SelectedOrderContextType {
  const context = useContext(SelectedOrderContext)
  if (context === undefined) {
    throw new Error('useSelectedOrder must be used within a SelectedOrderProvider')
  }
  return context
}
