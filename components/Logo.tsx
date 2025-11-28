import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
}

/**
 * The Equestrian Logo Component
 * 
 * Uses actual logo images:
 * - Full logo for desktop
 * - Icon (E) for mobile
 */

export function Logo({ variant = 'full', className = '' }: LogoProps) {
  const logoSrc = variant === 'full' ? '/logo-full.png' : '/logo-icon.png';
  const alt = variant === 'full' ? 'The Equestrian' : 'The Equestrian Icon';
  const width = variant === 'full' ? 200 : 40;
  const height = variant === 'full' ? 40 : 40;

  return (
    <Link href="/" className={`block ${className}`}>
      <Image
        src={logoSrc}
        alt={alt}
        width={width}
        height={height}
        priority
        className="object-contain"
      />
    </Link>
  );
}
