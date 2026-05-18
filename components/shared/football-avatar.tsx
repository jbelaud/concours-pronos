import Image from "next/image"
import { generateAvatarUrl } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface FootballAvatarProps {
  seed: string
  size?: number
  className?: string
  alt?: string
}

export function FootballAvatar({
  seed,
  size = 40,
  className,
  alt = "Avatar",
}: FootballAvatarProps) {
  const url = generateAvatarUrl(seed)

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-[var(--surface-elevated)] shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={url}
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        unoptimized
      />
    </div>
  )
}
