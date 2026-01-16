import type { ThemeClasses } from '@/shared/lib/theme'

interface ExpirationSettingsProps {
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
 * Extract expiration settings UI to reduce complexity
 */
export function ExpirationSettings({
  expirationEnabled,
  setExpirationEnabled,
  expirationDays,
  setExpirationDays,
  expirationHours,
  setExpirationHours,
  expirationMinutes,
  setExpirationMinutes,
  t,
}: ExpirationSettingsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={`block text-xs font-medium ${t.text}`}>Expiring offer</label>
        <button
          type="button"
          onClick={() => setExpirationEnabled(!expirationEnabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full backdrop-blur-3xl transition-all duration-300 focus:outline-none focus:ring-2 ${t.focusRing} overflow-hidden ${
            expirationEnabled
              ? 'bg-blue-500/20 border border-blue-400/30'
              : 'bg-white/5 border border-white/10'
          }`}
        >
          <span
            className={`relative inline-block h-3 w-3 transform rounded-full backdrop-blur-3xl transition-all duration-300 ${
              expirationEnabled
                ? 'translate-x-[20px] bg-blue-500/40'
                : 'translate-x-0.5 bg-white/30'
            }`}
          />
        </button>
      </div>
      {expirationEnabled && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <input
              type="number"
              min="0"
              value={expirationDays}
              onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
              placeholder="0"
              className={`w-full px-2 py-1.5 text-xs border ${t.border} rounded-lg backdrop-blur-xl ${t.input} ${t.text}`}
            />
            <label className={`block text-[10px] ${t.textSecondary} mt-1 text-center`}>Days</label>
          </div>
          <div>
            <input
              type="number"
              min="0"
              max="23"
              value={expirationHours}
              onChange={(e) => setExpirationHours(parseInt(e.target.value) || 0)}
              placeholder="0"
              className={`w-full px-2 py-1.5 text-xs border ${t.border} rounded-lg backdrop-blur-xl ${t.input} ${t.text}`}
            />
            <label className={`block text-[10px] ${t.textSecondary} mt-1 text-center`}>Hours</label>
          </div>
          <div>
            <input
              type="number"
              min="0"
              max="59"
              value={expirationMinutes}
              onChange={(e) => setExpirationMinutes(parseInt(e.target.value) || 0)}
              placeholder="0"
              className={`w-full px-2 py-1.5 text-xs border ${t.border} rounded-lg backdrop-blur-xl ${t.input} ${t.text}`}
            />
            <label className={`block text-[10px] ${t.textSecondary} mt-1 text-center`}>
              Minutes
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
