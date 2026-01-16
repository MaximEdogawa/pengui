import { useEffect} from 'react'

interface UseClickOutsideProps {
  isOpen: boolean
  onClose: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
  buttonRef: React.RefObject<HTMLButtonElement | null>
  dropdownRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Extract click outside handler to reduce NetworkPicker size
 */
export function useClickOutside({
  isOpen,
  onClose,
  containerRef,
  buttonRef,
  dropdownRef,
}: UseClickOutsideProps) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, containerRef, buttonRef, dropdownRef, onClose])
}
