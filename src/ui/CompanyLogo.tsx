import { Building2 } from 'lucide-react'

interface CompanyLogoProps {
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export default function CompanyLogo({
  name,
  size = 'sm',
  className = '',
}: CompanyLogoProps) {
  const cleanName = (name || '').trim()
  const monogram = cleanName
    ? cleanName
        .split(/[\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : ''

  const sizeClasses = {
    xs: 'h-5 w-5 text-[9px]',
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs font-semibold',
    lg: 'h-10 w-10 text-sm font-bold',
  }

  // Consistent brand tone derived dynamically from the company's name string
  const getTone = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const palettes = [
      'bg-blue-600 text-white',
      'bg-indigo-600 text-white',
      'bg-violet-600 text-white',
      'bg-sky-600 text-white',
      'bg-emerald-600 text-white',
      'bg-teal-600 text-white',
    ]
    return palettes[Math.abs(hash) % palettes.length]
  }

  const toneClass = cleanName ? getTone(cleanName) : 'bg-slate-700 text-white'

  return (
    <span
      className={`inline-grid place-items-center rounded-lg tracking-tight select-none shrink-0 ${sizeClasses[size]} ${toneClass} ${className}`}
      aria-hidden="true"
    >
      {monogram || <Building2 size={size === 'lg' ? 18 : size === 'md' ? 14 : 11} />}
    </span>
  )
}
