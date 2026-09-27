import Image from 'next/image'

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
 * When `invert` is true (default) the black lines flip to Ghost White so they
 * read on the Coffee Bean background, and the white field blends away. Set
 * `invert={false}` to keep the original black-on-white artwork on a light field.
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
      className={className}
      style={invert ? { filter: 'invert(1)', mixBlendMode: 'screen' } : undefined}
    />
  )
}
