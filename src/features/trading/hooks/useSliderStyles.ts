import { useEffect } from 'react'

/**
 * Extract style injection logic to reduce SleekPriceSlider size
 */
export function useSliderStyles(
  sliderId: string,
  styleId: string,
  sliderColor: string
) {
  // Escape ID for use in CSS selectors (useId can produce IDs with colons)
  const escapeCSSId = (id: string): string => {
    if (typeof CSS !== 'undefined' && CSS.escape) {
      return CSS.escape(id)
    }
    // Fallback: escape special characters manually
    return id.replace(/[^a-zA-Z0-9_-]/g, (char) => {
      const code = char.charCodeAt(0)
      if (code <= 0xff) {
        return `\\${code.toString(16).padStart(2, '0')} `
      }
      return `\\${code.toString(16)} `
    })
  }

  const cssEscapedSliderId = escapeCSSId(sliderId)

  // Inject slider styles
  useEffect(() => {
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }

    styleElement.textContent = `
      #${cssEscapedSliderId}::-webkit-slider-thumb {
        appearance: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${sliderColor};
        border: 1.5px solid rgba(255, 255, 255, 0.9);
        cursor: pointer;
        box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.15);
        transition: all 0.2s ease;
      }
      #${cssEscapedSliderId}::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.25);
      }
      #${cssEscapedSliderId}::-moz-range-thumb {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${sliderColor};
        border: 1.5px solid rgba(255, 255, 255, 0.9);
        cursor: pointer;
        box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.15);
        transition: all 0.2s ease;
      }
      #${cssEscapedSliderId}::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.25);
      }
    `

    return () => {
      const element = document.getElementById(styleId)
      if (element) {
        element.remove()
      }
    }
  }, [sliderColor, cssEscapedSliderId, styleId])

  return cssEscapedSliderId
}
