/**
 * Mock for Next.js Image component
 * Used in test environment to avoid URL parsing issues
 */

import React from 'react'

interface ImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  className?: string
  [key: string]: unknown
}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt, width, height, fill, className, ...props }, ref) => {
    // Extract the actual image URL from Next.js Image src format
    let imageSrc = src
    if (typeof src === 'string' && src.startsWith('/_next/image')) {
      // Parse Next.js Image URL format: /_next/image?url=%2Fpath&w=3840&q=75
      try {
        // Use a base URL for parsing
        const baseUrl = typeof window !== 'undefined' && window.location 
          ? window.location.origin 
          : 'http://localhost:3000'
        const url = new URL(src, baseUrl)
        const urlParam = url.searchParams.get('url')
        if (urlParam) {
          imageSrc = decodeURIComponent(urlParam)
        }
      } catch {
        // If parsing fails, try to extract URL manually
        const match = src.match(/url=([^&]+)/)
        if (match) {
          imageSrc = decodeURIComponent(match[1])
        }
      }
    }

    const imgProps: React.ImgHTMLAttributes<HTMLImageElement> = {
      src: imageSrc as string,
      alt: alt as string,
      className: className as string | undefined,
      ...(props as React.ImgHTMLAttributes<HTMLImageElement>),
    }

    if (!fill) {
      if (width !== undefined) imgProps.width = width as number
      if (height !== undefined) imgProps.height = height as number
    } else {
      const existingStyle = imgProps.style || {}
      imgProps.style = { 
        ...(typeof existingStyle === 'object' && existingStyle !== null ? existingStyle : {}), 
        width: '100%', 
        height: '100%', 
        objectFit: 'contain' 
      } as React.CSSProperties
    }

    return <img ref={ref} {...imgProps} />
  }
)

Image.displayName = 'Image'

export default Image
