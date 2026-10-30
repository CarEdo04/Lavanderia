// Stroke icons in the current text colour. They are decorative: the text next
// to them (or an aria-label on the control) says what they mean.
type Props = { className?: string };

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const WasherIcon = ({ className = "size-5" }: Props) => (
  <svg {...svg} className={className}>
    <rect x="4" y="2.5" width="16" height="19" rx="3" />
    <circle cx="12" cy="13.5" r="4.5" />
    <path d="M7.5 6h2" />
  </svg>
);

export const CalendarIcon = ({ className = "size-6" }: Props) => (
  <svg {...svg} className={className}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

export const TicketIcon = ({ className = "size-6" }: Props) => (
  <svg {...svg} className={className}>
    <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6z" />
  </svg>
);

export const BookIcon = ({ className = "size-6" }: Props) => (
  <svg {...svg} className={className}>
    <path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h10" />
  </svg>
);

export const SettingsIcon = ({ className = "size-6" }: Props) => (
  <svg {...svg} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const AlertIcon = ({ className = "size-5" }: Props) => (
  <svg {...svg} className={className}>
    <path d="M12 4 2.8 19.5h18.4z" />
    <path d="M12 10v4.5M12 17.2v.3" />
  </svg>
);

export const InfoIcon = ({ className = "size-5" }: Props) => (
  <svg {...svg} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8v.3" />
  </svg>
);

export const LockIcon = ({ className = "size-5" }: Props) => (
  <svg {...svg} className={className}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const PlusIcon = ({ className = "size-4" }: Props) => (
  <svg {...svg} strokeWidth={2.2} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ClockIcon = ({ className = "size-[18px]" }: Props) => (
  <svg {...svg} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const UndoIcon = ({ className = "size-[18px]" }: Props) => (
  <svg {...svg} className={className}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const LogoutIcon = ({ className = "size-[18px]" }: Props) => (
  <svg {...svg} className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);
