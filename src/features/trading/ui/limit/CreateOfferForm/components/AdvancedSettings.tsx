import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'
import { ExpirationSettings } from './ExpirationSettings'

interface AdvancedSettingsProps {
  isDetailedViewExpanded: boolean
  setIsDetailedViewExpanded: (expanded: boolean) => void
  expirationEnabled: boolean
  setExpirationEnabled: (enabled: boolean) => void
  expirationDays: number
  setExpirationDays: (days: number) => void
  expirationHours: number
  setExpirationHours: (hours: number) => void
  expirationMinutes: number
  setExpirationMinutes: (minutes: number) => void
  t: ThemeClasses
}

/**
 * Extract advanced settings collapsible section to reduce CreateOfferForm size
 */
export function AdvancedSettings({
  isDetailedViewExpanded,
  setIsDetailedViewExpanded,
  expirationEnabled,
  setExpirationEnabled,
  expirationDays,
  setExpirationDays,
  expirationHours,
  setExpirationHours,
  expirationMinutes,
  setExpirationMinutes,
  t,
}: AdvancedSettingsProps) {
  return (
    <div
      className={`rounded-lg backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5 overflow-hidden transition-all`}
      style={{
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <button
        type="button"
        onClick={() => setIsDetailedViewExpanded(!isDetailedViewExpanded)}
        className={`w-full p-3 flex items-center justify-between ${t.cardHover} transition-colors`}
      >
        <span className={`text-sm font-medium ${t.text}`}>Advanced Settings</span>
        {isDetailedViewExpanded ? (
          <ChevronDown className={`w-4 h-4 ${t.textSecondary}`} />
        ) : (
          <ChevronRight className={`w-4 h-4 ${t.textSecondary}`} />
        )}
      </button>
      {isDetailedViewExpanded && (
        <div className="p-3 border-t border-white/10 dark:border-white/5 space-y-4">
          <ExpirationSettings
            expirationEnabled={expirationEnabled}
            setExpirationEnabled={setExpirationEnabled}
            expirationDays={expirationDays}
            setExpirationDays={setExpirationDays}
            expirationHours={expirationHours}
            setExpirationHours={setExpirationHours}
            expirationMinutes={expirationMinutes}
            setExpirationMinutes={setExpirationMinutes}
            t={t}
          />
        </div>
      )}
    </div>
  )
}
