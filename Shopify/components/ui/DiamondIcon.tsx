import { DIAMOND_SVG_PATH } from '@/constants/diamonds';

interface DiamondIconProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
  id?: string;
}

const sizeMap = {
  sm: { width: '32', height: '38', viewBox: '0 0 32 38', className: 'w-8 h-[37.5px]' },
  md: { width: '31.5004', height: '37.5', viewBox: '0 0 32 38', className: 'w-8 h-[37.5px]' },
  lg: { width: '78.7511', height: '93.75', viewBox: '0 0 79 94', className: 'w-[78.75px] h-[93.75px]' }
};

export default function DiamondIcon({ 
  size = 'md', 
  color = '#DEBE5F',
  className = '',
  id
}: DiamondIconProps) {
  const sizeConfig = sizeMap[size];
  const clipPathId = id || `clip0_diamond_${size}_${Math.random().toString(36).substring(2, 9)}`;

  return (
    <svg 
      className={`${sizeConfig.className} ${className}`} 
      fill="none" 
      viewBox={sizeConfig.viewBox} 
      preserveAspectRatio="none"
    >
      <g clipPath={`url(#${clipPathId})`}>
        <path d={DIAMOND_SVG_PATH} fill={color} />
      </g>
      <defs>
        <clipPath id={clipPathId}>
          <rect width={sizeConfig.width} height={sizeConfig.height} fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

