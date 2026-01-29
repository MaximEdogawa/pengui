import { useThemeClasses } from '@/shared/hooks'

interface FormMessagesProps {
  errorMessage: string
  successMessage: string
}

export function FormMessages({ errorMessage, successMessage }: FormMessagesProps) {
  const { t } = useThemeClasses()

  return (
    <>
      {errorMessage && (
        <div
          className={`p-2 rounded-lg border ${t.border} backdrop-blur-xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`}
        >
          <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}
      {successMessage && (
        <div
          className={`p-2 rounded-lg border ${t.border} backdrop-blur-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800`}
        >
          <p className="text-xs text-green-700 dark:text-green-300">{successMessage}</p>
        </div>
      )}
    </>
  )
}
