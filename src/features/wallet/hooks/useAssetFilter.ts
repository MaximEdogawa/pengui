'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { WalletAssetItem } from './useWalletAssets'

export type AssetFilterCategory = 'all' | 'tokens' | 'investments'

const FILTER_PARAM = 'filter'
const SEARCH_PARAM = 'search'

const DEBOUNCE_MS = 250

/**
 * Filters wallet assets by category and search query.
 * Syncs filter and search to URL query params for shareable/bookmarkable views.
 */
export function useAssetFilter(assets: WalletAssetItem[]) {
  const searchParams = useSearchParams()

  const categoryFromUrl = (searchParams.get(FILTER_PARAM) as AssetFilterCategory) || 'all'
  const searchFromUrl = searchParams.get(SEARCH_PARAM) || ''

  const [category, setCategoryState] = useState<AssetFilterCategory>(categoryFromUrl)
  const [searchQuery, setSearchQueryState] = useState(searchFromUrl)
  const [debouncedSearch, setDebouncedSearch] = useState(searchFromUrl)

  const updateUrl = useCallback(
    (updates: { filter?: AssetFilterCategory; search?: string }) => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(searchParams.toString())
      if (updates.filter !== undefined) {
        if (updates.filter === 'all') params.delete(FILTER_PARAM)
        else params.set(FILTER_PARAM, updates.filter)
      }
      if (updates.search !== undefined) {
        if (updates.search === '') params.delete(SEARCH_PARAM)
        else params.set(SEARCH_PARAM, updates.search)
      }
      const url = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
      window.history.replaceState(null, '', url)
    },
    [searchParams]
  )

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      updateUrl({ search: searchQuery })
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery, updateUrl])

  const setCategory = useCallback(
    (value: AssetFilterCategory) => {
      setCategoryState(value)
      updateUrl({ filter: value })
    },
    [updateUrl]
  )

  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryState(value)
  }, [])

  const filteredAssets = useMemo(() => {
    let list = assets

    if (category === 'tokens') {
      list = list.filter((a) => a.type === 'xch' || a.type === 'cat')
    } else if (category === 'investments') {
      list = list.filter((a) => a.type === 'investment')
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase()
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.ticker.toLowerCase().includes(q)
      )
    }

    return list
  }, [assets, category, debouncedSearch])

  return {
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    filteredAssets,
  }
}
