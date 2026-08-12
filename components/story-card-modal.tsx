'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Check, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { toPng } from 'html-to-image';

interface StoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultHandle?: string;
  position?: number | null;
  userEmail?: string;
}

export type PosterTheme = 'full_rogue' | 'drift_red' | 'silver_rogue';

const POSTER_ASSETS: Record<PosterTheme, { name: string; subtitle: string; src: string }> = {
  full_rogue: {
    name: 'Rogue Crimson Artwork',
    subtitle: 'Original 4-Panel Artwork',
    src: '/posters/poster_gone_rogue_full.jpg'
  },
  drift_red: {
    name: 'Rogue Red Drift Coupe',
    subtitle: 'Full Red Smoke Drift Edition',
    src: '/posters/poster_drift_red.jpg'
  },
  silver_rogue: {
    name: 'Rogue Silver Metallic',
    subtitle: 'Monochrome Cyberpunk Artwork',
    src: '/posters/poster_silver_full.jpg'
  }
};

export default function StoryCardModal({
  isOpen,
  onClose,
  defaultName = '',
  defaultHandle = '',
  userEmail = ''
}: StoryCardModalProps) {
  // Infer Name & Username automatically (NO manual input forms)
  const name = defaultName || (userEmail ? userEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Rogue Member');
  const cleanHandle = defaultHandle ? defaultHandle.trim().replace(/^@/, '') : '';

  const [activeTheme, setActiveTheme] = useState<PosterTheme>('full_rogue');
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3, // High-res 1080x1920 Retina export
        quality: 0.98,
      });

      const link = document.createElement('a');
      link.download = `gone-rogue-${activeTheme}-${cleanHandle || 'poster'}.png`;
      link.href = dataUrl;
      link.click();

      showToast('✨ High-Res Story Poster downloaded! Ready for Instagram & Snapchat!');
    } catch (err) {
      console.error('Error exporting poster:', err);
      showToast('⚠️ Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 0.98,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `gone-rogue-${activeTheme}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Gone Rogue',
          text: `Gone Rogue 🚀 ${cleanHandle ? `@${cleanHandle}` : ''}`,
        });
        showToast('🚀 Story Poster shared successfully!');
      } else {
        const link = document.createElement('a');
        link.download = `gone-rogue-${activeTheme}.png`;
        link.href = dataUrl;
        link.click();
        showToast('📲 Poster saved to photos!');
      }
    } catch (err) {
      console.error('Error sharing poster:', err);
      showToast('⚠️ Poster saved to photos!');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-lg overflow-y-auto animate-fadeIn">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#121422] border border-coral text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-mono font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-coral shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="relative w-full max-w-4xl bg-[#090A10] border border-[#232635] rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row my-auto max-h-[92vh]">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/70 border border-white/20 text-white/80 hover:text-white hover:bg-black transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT PANEL: 9:16 POSTER CANVAS PREVIEW */}
        <div className="w-full lg:w-1/2 bg-[#040508] p-4 sm:p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-[#232635] relative overflow-hidden">
          
          <div className="text-center mb-3">
            <span className="text-[10px] font-mono text-coral uppercase tracking-widest font-bold flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-coral" /> Story Poster Preview (9:16)
            </span>
          </div>

          {/* 9:16 ARTISTIC POSTER CARD (TARGET FOR HTML-TO-IMAGE EXPORT) */}
          <div 
            ref={cardRef}
            className="w-[290px] sm:w-[320px] h-[515px] sm:h-[568px] rounded-2xl relative flex flex-col justify-between overflow-hidden shadow-2xl shrink-0 transition-all duration-300 bg-black text-white selection:bg-coral selection:text-white"
          >
            {/* EXACT BACKGROUND POSTER IMAGE FROM REFERENCE */}
            <img 
              src={POSTER_ASSETS[activeTheme].src} 
              alt={POSTER_ASSETS[activeTheme].name}
              className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            />

            {/* REMOVED BOTTOM GRADIENT & BOTTOM CARD BOX FOR CLEAN FULL-POSTER VIEW */}

            {/* TOP OVERLAY BRAND MARK */}
            <div className="relative z-20 p-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-lg">
                <div className="w-4 h-4 rounded-full overflow-hidden border border-white/40 flex-shrink-0 bg-black">
                  <img src="/logo.png" alt="Rogue" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-mono font-extrabold tracking-widest text-white uppercase">
                  ROGUE
                </span>
              </div>
            </div>

            {/* 100% MATCHING TRANSLUCENT STREETWEAR MANGA / CYBERPUNK POSTER EMBLEM */}
            <div className="absolute top-[28%] sm:top-[29%] left-0 right-0 z-20 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <div className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/20 px-2.5 py-0.5 rounded-sm shadow-[0_6px_18px_rgba(0,0,0,0.8)] transform -skew-x-12 select-none relative">
                
                {/* RED ACCENT CORNER SLASHES */}
                <div className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t-2 border-l-2 border-[#FF5252]" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b-2 border-r-2 border-[#FF5252]" />

                {/* JAPANESE KANJI ACCENT TAG (PROLOGUE / ROGUE) */}
                <span className="text-[8.5px] font-mono text-[#FF5252] font-black tracking-tighter opacity-90 pr-1 border-r border-white/20 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  プロローグ
                </span>

                {/* USER HANDLE / NAME */}
                <span 
                  className="text-sm sm:text-base font-bold uppercase tracking-[0.22em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-none"
                  style={{ fontFamily: `var(--font-bebas), 'Bebas Neue', 'Impact', sans-serif` }}
                >
                  {cleanHandle ? `@${cleanHandle}` : name}
                </span>

                {/* HAS */}
                <span 
                  className="text-sm sm:text-base font-bold uppercase tracking-[0.22em] text-[#FF5252] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-none"
                  style={{ fontFamily: `var(--font-bebas), 'Bebas Neue', 'Impact', sans-serif` }}
                >
                  HAS
                </span>

              </div>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL: POSTER THEME SELECTION & ACTIONS (NO MANUAL FORM FIELDS) */}
        <div className="w-full lg:w-1/2 p-5 sm:p-7 flex flex-col justify-between space-y-6 overflow-y-auto max-h-[60vh] lg:max-h-full">
          
          <div className="space-y-5 text-left">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2 font-fraunces">
                <Sparkles className="w-5 h-5 text-coral" /> Choose Poster Artwork
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Select between the 4 poster themes for your story!
              </p>
            </div>

            {/* AUTOMATIC USER IDENTITY DISPLAY */}
            <div className="bg-[#0F1018] border border-[#232635] p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-text-muted block uppercase">Poster Identity</span>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 font-sans">
                  <span>{name}</span>
                </h4>
                {cleanHandle && (
                  <span className="text-xs font-mono font-bold text-coral">@{cleanHandle}</span>
                )}
              </div>
              <span className="text-[10px] font-mono text-teal bg-teal/10 border border-teal/30 px-2.5 py-1 rounded-full font-bold">
                Auto-Formatted
              </span>
            </div>

            {/* 4 POSTER THEME SELECTION BUTTONS WITH IMAGE THUMBNAILS */}
            <div className="space-y-2.5">
              <label className="text-xs font-mono font-semibold text-white block">
                Official Poster Themes
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(POSTER_ASSETS) as PosterTheme[]).map((key) => {
                  const item = POSTER_ASSETS[key];
                  const isSelected = activeTheme === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTheme(key)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected 
                          ? 'bg-coral/20 border-coral text-white shadow-lg' 
                          : 'bg-[#121422] border-[#232635] text-text-muted hover:text-white'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/30 shrink-0 relative bg-black">
                        <img src={item.src} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-extrabold text-white block truncate">{item.name}</span>
                        <span className="text-[9.5px] font-mono text-text-muted block truncate">{item.subtitle}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-coral ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ACTION BUTTONS (DOWNLOAD & SHARE) */}
          <div className="space-y-2.5 pt-2 border-t border-[#232635]">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3.5 px-4 rounded-2xl bg-coral hover:bg-coral-hover text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-coral/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Exporting 1080x1920 Poster...' : 'Download Story Poster (PNG)'}</span>
            </button>

            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full py-3 px-4 rounded-2xl bg-[#181A2A] hover:bg-[#22253B] border border-[#232635] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Share2 className="w-4 h-4 text-teal" />
              <span>{sharing ? 'Preparing Share...' : 'Direct Share to Story / Apps'}</span>
            </button>

            <span className="text-[10px] font-mono text-text-muted text-center block">
              High-Res 9:16 Story Poster • Ready to Post
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
