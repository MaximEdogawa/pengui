import { useState, useRef, useEffect } from 'react'

export type UseOfferDetailsStateReturn = ReturnType<typeof useOfferDetailsState>

export function useOfferDetailsState() {
  const [isCancelling, setIsCancelling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isStateValidating, setIsStateValidating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [stateValidationError, setStateValidationError] = useState('')

  const validationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const intervalId = validationIntervalRef.current
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [])

  return {
    isCancelling,
    setIsCancelling,
    isDeleting,
    setIsDeleting,
    isValidating,
    setIsValidating,
    isStateValidating,
    setIsStateValidating,
    isCopied,
    setIsCopied,
    showCancelConfirmation,
    setShowCancelConfirmation,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    cancelError,
    setCancelError,
    deleteError,
    setDeleteError,
    uploadError,
    setUploadError,
    validationError,
    setValidationError,
    stateValidationError,
    setStateValidationError,
    validationIntervalRef,
  }
}
