import type { OfferDetails } from '@/entities/offer'
import { environment } from '@/shared/lib/config/environment'
import { logger } from '@/shared/lib/logger'
import Dexie, { type Table } from 'dexie'

// Extended offer interface for database storage
export interface StoredOffer extends OfferDetails {
  // Additional fields for database management
  syncedAt?: Date
  lastModified: Date
  isLocal: boolean
  walletAddress?: string
}

// Database class
export class PenguiDB extends Dexie {
  // Define tables
  offers!: Table<StoredOffer>

  constructor() {
    super(environment.database.indexedDB.name)

    this.version(environment.database.indexedDB.version).stores({
      offers: '++id, id, tradeId, status, createdAt, lastModified, walletAddress, syncedAt',
    })
  }
}

// Create database instance
let dbInstance: PenguiDB | null = null
let dbReady = false
let dbInitializing = false

// Get database instance with lazy initialization
export function getDB(): PenguiDB {
  if (!dbInstance) {
    dbInstance = new PenguiDB()
  }
  return dbInstance
}

// Get the db instance (for backward compatibility)
export const db = getDB()

// Database initialization with error handling
export async function initializeDatabase(): Promise<void> {
  if (dbReady) {
    return
  }

  if (dbInitializing) {
    // Wait for existing initialization using recursion
    const waitForInitialization = async (): Promise<void> => {
      if (!dbInitializing || dbReady) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
      return waitForInitialization()
    }
    await waitForInitialization()
    return
  }

  if (!isIndexedDBSupported()) {
    throw new Error('IndexedDB is not supported in this browser')
  }

  dbInitializing = true

  try {
    const database = getDB()
    await database.open()
    dbReady = true
    logger.info('✅ IndexedDB initialized successfully')
  } catch (error) {
    dbReady = false
    logger.error('❌ Failed to initialize IndexedDB:', error)
    throw error
  } finally {
    dbInitializing = false
  }
}

// Check if database is ready
export function isDatabaseReady(): boolean {
  return dbReady && getDB().isOpen()
}

// Ensure database is ready before operations
export async function ensureDatabaseReady(): Promise<void> {
  if (!isDatabaseReady()) {
    await initializeDatabase()
  }
}

// Database cleanup
export async function clearDatabase(): Promise<void> {
  try {
    const database = getDB()
    if (database.isOpen()) {
      await database.delete()
      dbReady = false
      dbInstance = null
    }
  } catch (error) {
    logger.error('❌ Failed to clear database:', error)
    throw error
  }
}

// Check if database is supported
export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

// Timeout wrapper for IndexedDB operations
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  operation: string = 'operation'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeout])
}
