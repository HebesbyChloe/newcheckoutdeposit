interface DecorativeLineProps {
  variant?: 'left-to-right' | 'right-to-left';
  className?: string;
}

export default function DecorativeLine({ 
  variant = 'left-to-right',
  className = '' 
}: DecorativeLineProps) {
  const gradientId = variant === 'left-to-right' ? 'paint0_linear_1' : 'paint0_linear_2';
  const stops = variant === 'left-to-right' 
    ? [
        { stopColor: '#DEC481' },
        { stopColor: '#786A46', offset: 1 }
      ]
    : [
        { stopColor: '#786A46' },
        { stopColor: '#DEC481', offset: 1 }
      ];

  return (
    <div className={`flex-1 max-w-[500px] h-[1px] ${className}`}>
      <svg className="w-full h-[1px]" fill="none" viewBox="0 0 500 1" preserveAspectRatio="none">
        <path d="M0 0.5H500" stroke={`url(#${gradientId})`} />
        <defs>
          <linearGradient id={gradientId} x1="0" x2="500" y1="1.5" y2="1.5" gradientUnits="userSpaceOnUse">
            {stops.map((stop, index) => (
              <stop key={index} stopColor={stop.stopColor} offset={stop.offset} />
            ))}
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

