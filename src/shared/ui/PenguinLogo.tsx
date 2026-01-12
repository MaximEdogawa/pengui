import Image from 'next/image'

interface PenguinLogoProps {
  size?: number
  className?: string
  fill?: boolean
  priority?: boolean
}

export default function PenguinLogo({
  size = 48,
  className = '',
  fill = false,
  priority = false,
}: PenguinLogoProps) {
  if (fill) {
    return (
      <Image
        src="/pengui-logo.png"
        fill
        priority={priority}
        alt="Pengui Logo"
        className={`${className} object-contain`}
      />
    )
  }

  return (
    <Image
      src="/pengui-logo.png"
      width={size}
      height={size}
      priority={priority}
      alt="Pengui Logo"
      className={className}
    />
  )
}
