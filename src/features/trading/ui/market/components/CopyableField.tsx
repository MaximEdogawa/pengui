import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'
import { copyToClipboard } from '@/shared/lib/utils/clipboard'

interface CopyableFieldProps {
  label: string
  value: string
  className?: string
}

export function CopyableField({ label, value, className = '' }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const result = await copyToClipboard(value)
    if (result.success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [value])

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}:</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className={`text-xs font-mono text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-800/50 p-2 rounded ${className}`}>
        {value}
      </div>
    </div>
  )
}
