import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
})

export const SearchIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
)

export const XIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export const SunIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
)

export const MoonIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
  </svg>
)

export const PlusIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const FileIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </svg>
)

export const DownloadIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 4v11" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M5 19.5h14" />
  </svg>
)

export const ExternalIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19V7.5A1.5 1.5 0 0 1 5.5 6H11" />
  </svg>
)

export const ShareIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="17.5" cy="6" r="2.5" />
    <circle cx="6.5" cy="12" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
    <path d="m8.8 10.8 6.4-3.4M8.8 13.2l6.4 3.4" />
  </svg>
)

export const CheckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
)

export const TrashIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 7h16M9.5 4.5h5M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" />
    <path d="M10.5 11v6M13.5 11v6" />
  </svg>
)

export const PencilIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16Z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
)

export const ShieldIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3.5 19 6v5.5c0 4.6-2.9 8-7 9.5-4.1-1.5-7-4.9-7-9.5V6Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

export const LogOutIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 8 6 12l4 4M6 12h9" />
  </svg>
)

export const UserIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="8.5" r="3.7" />
    <path d="M5 20c.7-3.4 3.5-5.2 7-5.2s6.3 1.8 7 5.2" />
  </svg>
)

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m10 6 6 6-6 6" />
  </svg>
)

export const LoaderIcon = (props: IconProps) => (
  <svg {...base(props)} className={`animate-spin ${props.className ?? ''}`}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
)

export const LinkIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7L11.5 6.8" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.3-1.3" />
  </svg>
)

export const AlertIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.4v.2" />
  </svg>
)

export const CopyIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
  </svg>
)

export const BookIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 5.5A2 2 0 0 1 6 3.5h13v17H6a2 2 0 0 0-2 2Z" />
    <path d="M4 19.5V5.5" />
    <path d="M8.5 8h6" />
  </svg>
)

export const LockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.4" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
)

export const DeviceIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="6" y="2.5" width="12" height="19" rx="2.6" />
    <path d="M10.5 18.5h3" />
  </svg>
)

export const RefreshIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5" />
    <path d="M4 4v4.5h4.5" />
    <path d="M4 12.5A8 8 0 0 0 17.7 17.7L20 15.5" />
    <path d="M20 20v-4.5h-4.5" />
  </svg>
)
