'use client';

import React, { useState } from 'react';
import { Crown, Star } from 'lucide-react';

export interface FoundingBadgeType {
  signup_number?: number;
  type: 'founder' | 'early_star' | 'founding_member' | string;
  icon?: string;
  label: string;
  tooltip: string;
}

interface FoundingBadgeProps {
  badge?: FoundingBadgeType | null;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export default function FoundingBadge({ badge, size = 'md', showTooltip = true }: FoundingBadgeProps) {
  const [activeTooltip, setActiveTooltip] = useState(false);

  if (!badge) return null;

  const isFounder = badge.type === 'founder';
  const isEarlyStar = badge.type === 'early_star';

  let badgeStyles = 'bg-[#121422] border-amber-400/35 text-amber-300 hover:border-amber-400/60 shadow-none';
  let iconComponent = <Crown className="w-3 h-3 text-amber-400 shrink-0" />;

  if (isFounder) {
    badgeStyles = 'bg-[#121422] border-amber-400/40 text-amber-300 hover:border-amber-400/70 shadow-none';
    iconComponent = <Crown className="w-3 h-3 text-amber-400 shrink-0" />;
  } else if (isEarlyStar) {
    badgeStyles = 'bg-[#121422] border-teal-400/40 text-teal-300 hover:border-teal-400/70 shadow-none';
    iconComponent = <Star className="w-3 h-3 text-teal-400 shrink-0" />;
  }

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[9.5px] gap-1 rounded-full' 
    : size === 'lg' 
      ? 'px-3 py-1 text-xs gap-1.5 font-bold rounded-full' 
      : 'px-2.5 py-0.5 text-[10.5px] gap-1 rounded-full';

  return (
    <div className="relative inline-flex items-center group">
      <div 
        onClick={() => setActiveTooltip(!activeTooltip)}
        onMouseEnter={() => setActiveTooltip(true)}
        onMouseLeave={() => setActiveTooltip(false)}
        className={`inline-flex items-center border font-mono font-bold tracking-tight cursor-pointer select-none transition-all duration-200 hover:scale-102 ${badgeStyles} ${sizeClasses}`}
      >
        {iconComponent}
        <span className="truncate">{badge.label}</span>
      </div>

      {showTooltip && activeTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2.5 z-50 w-max max-w-xs bg-[#0F111C]/95 border border-amber-400/40 text-white text-[11px] p-3 rounded-2xl shadow-2xl backdrop-blur-xl pointer-events-none animate-fadeIn">
          <div className="flex items-center gap-1.5 font-extrabold text-amber-300 mb-1">
            <Crown className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>{badge.label}</span>
          </div>
          <p className="text-text-muted text-[10px] leading-tight">{badge.tooltip}</p>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-[#0F111C]" />
        </div>
      )}
    </div>
  );
}
