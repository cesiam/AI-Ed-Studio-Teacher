import Image from 'next/image'
import { cn } from '@/lib/utils'

type DoodleImageProps = {
  src: string
  alt?: string
  width: number
  height: number
  className?: string
  priority?: boolean
  invert?: boolean
}

/**
 * The source line-art is black strokes on a white/transparent field.
 * When `invert` is true (default) the art follows the theme: black ink on the
 * light ground, flipped to Ghost White on the dark one (see .doodle-art in
 * globals.css). Set `invert={false}` to always keep the original artwork.
 */
export function DoodleImage({
  src,
  alt = '',
  width,
  height,
  className,
  priority,
  invert = true,
}: DoodleImageProps) {
  return (
    <Image
      src={src || '/placeholder.svg'}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      aria-hidden={alt === '' ? true : undefined}
      className={cn(invert && 'doodle-art', className)}
    />
  )
}
