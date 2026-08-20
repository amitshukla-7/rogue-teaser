'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Users, 
  MessageSquare, 
  Flame, 
  Crown, 
  Share2, 
  Copy, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Heart,
  Globe,
  Shuffle,
  Calendar,
  MessageCircle,
  ThumbsUp,
  Star,
  CheckCircle2,
  Send,
  MoreVertical,
  Compass,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  X,
  BellRing,
  Award,
  TrendingUp,
  ImageIcon,
  ArrowUp,
  Bookmark,
  Pin,
  CheckCircle,
  FileText,
  Clock,
  Lock,
  BarChart2,
  Plus,
  Trash2
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import FoundingBadge from '../components/founding-badge';
import StoryCardModal from '../components/story-card-modal';

export default function TeaserPage() {
  const [waitlistCount, setWaitlistCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [submittedPosition, setSubmittedPosition] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [incomingRefCode, setIncomingRefCode] = useState<string>('');
  const [error, setError] = useState('');

  // CLAIM @HANDLE STATE
  const [claimedHandle, setClaimedHandle] = useState<string>('');
  const [handleInput, setHandleInput] = useState<string>('');
  const [claimingHandle, setClaimingHandle] = useState(false);
  const [handleError, setHandleError] = useState('');
  const [handleSuccess, setHandleSuccess] = useState('');

  // STORY CARD MODAL STATE
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  // PERSONAL EMAIL NUDGE BANNER
  const [isPersonalEmailUser, setIsPersonalEmailUser] = useState(false);

  // COUNTDOWN TIMER TO AUGUST 20, 2026 12:00 PM
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 10,
    hours: 3,
    minutes: 4,
    seconds: 12
  });

  // CAROUSEL AUTO-SLIDE & ACTIVE SLIDE INDEX
  const TOTAL_SLIDES = 7;
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // TEASER POST FEATURE STATE (MATCHING EXACT ROGUE BLUEPRINT)
  const [hasTeaserPosted, setHasTeaserPosted] = useState<boolean>(false);
  const [teaserName, setTeaserName] = useState<string>('');
  const [teaserTitle, setTeaserTitle] = useState<string>('');
  const [teaserContent, setTeaserContent] = useState<string>('');
  const [teaserTopic, setTeaserTopic] = useState<string>('General');
  const [teaserIsAnonymous, setTeaserIsAnonymous] = useState<boolean>(false);
  const [isPollPost, setIsPollPost] = useState<boolean>(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDuration, setPollDuration] = useState<'8h' | '24h' | 'always'>('24h');
  const [submittingTeaserPost, setSubmittingTeaserPost] = useState<boolean>(false);
  const [teaserPostError, setTeaserPostError] = useState<string>('');
  const [savedTeaserPostTitle, setSavedTeaserPostTitle] = useState<string>('');
  const [savedTeaserPostContent, setSavedTeaserPostContent] = useState<string>('');

  useEffect(() => {
    fetchWaitlistStats();
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    // Check if user has already posted from teaser site
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('rogue_teaser_email') || '';
      if (savedEmail) {
        setUserEmail(savedEmail);
      }

      const isPosted = localStorage.getItem('rogue_teaser_user_posted');
      if (isPosted === 'true') {
        setHasTeaserPosted(true);
        setSavedTeaserPostTitle(localStorage.getItem('rogue_teaser_post_title') || '');
        setSavedTeaserPostContent(localStorage.getItem('rogue_teaser_post_content') || '');
      }

      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref') || localStorage.getItem('rogue_ref_code') || '';
      if (refParam) {
        setIncomingRefCode(refParam);
        localStorage.setItem('rogue_ref_code', refParam);
      }

      const urlError = params.get('error');
      if (urlError) {
        setError(decodeURIComponent(urlError));
      }
      if (params.get('registered') === 'true' || params.get('google_auth') === 'success') {
        const email = params.get('email') || 'student@mits.ac.in';
        const positionParam = params.get('position');
        const pos = positionParam ? parseInt(positionParam, 10) : 1;
        setUserEmail(email);
        localStorage.setItem('rogue_teaser_email', email);
        setSubmittedPosition(pos);
        if (params.get('personal_email') === 'true') {
          setIsPersonalEmailUser(true);
        }
      }
    }

    return () => clearInterval(interval);
  }, []);

  const handleCreateTeaserPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;

    if (!teaserTitle.trim() || !teaserContent.trim()) {
      setTeaserPostError('Please fill in both post title and details.');
      return;
    }

    setSubmittingTeaserPost(true);
    setTeaserPostError('');

    let pollPayload = null;
    if (isPollPost) {
      const validOptions = pollOptions.map(o => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        setTeaserPostError('Please add at least 2 valid options for your poll.');
        setSubmittingTeaserPost(false);
        return;
      }
      pollPayload = {
        question: teaserTitle.trim(),
        options: validOptions,
        duration: pollDuration
      };
    }

    const finalTitle = teaserTitle.trim();
    const finalContent = teaserContent.trim();

    try {
      const data = await apiFetch('/api/posts/teaser', {
        method: 'POST',
        body: JSON.stringify({
          name: teaserName.trim(),
          email: userEmail,
          title: finalTitle,
          content: finalContent,
          topic: teaserTopic,
          is_anonymous: teaserIsAnonymous,
          poll: pollPayload
        })
      });

      if (data && data.success) {
        setHasTeaserPosted(true);
        localStorage.setItem('rogue_teaser_user_posted', 'true');
        setSavedTeaserPostTitle(finalTitle);
        setSavedTeaserPostContent(finalContent);
        setTeaserTitle('');
        setTeaserContent('');
        localStorage.setItem('rogue_teaser_post_title', finalTitle);
        localStorage.setItem('rogue_teaser_post_content', finalContent);
      } else {
        setTeaserPostError((data && data.error) || 'Failed to submit post.');
      }
    } catch (err: any) {
      console.error('Teaser post error:', err);
      setTeaserPostError(err.message || 'Failed to connect to backend server. Please try again.');
    } finally {
      setSubmittingTeaserPost(false);
    }
  };

  // Fetch handle whenever userEmail changes
  useEffect(() => {
    if (userEmail) {
      apiFetch(`/api/waitlist/claim-handle?email=${encodeURIComponent(userEmail)}`)
        .then((data) => {
          if (data && data.handle) {
            setClaimedHandle(data.handle);
            setHandleInput(data.handle);
          }
        })
        .catch(() => {});
    }
  }, [userEmail]);

  const handleClaimHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim() || !userEmail) return;

    setClaimingHandle(true);
    setHandleError('');
    setHandleSuccess('');

    try {
      const data = await apiFetch('/api/waitlist/claim-handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, handle: handleInput })
      });

      if (data && data.handle) {
        setClaimedHandle(data.handle);
        setHandleSuccess(`Awesome! @${data.handle} is reserved for you on launch day.`);
      } else if (data && data.error) {
        setHandleError(data.error);
      }
    } catch (err: any) {
      setHandleError(err.message || 'Failed to reserve @handle. Please try again.');
    } finally {
      setClaimingHandle(false);
    }
  };

  // Auto-play timer for feature carousel (disabled by default)
  useEffect(() => {
    if (!isAutoPlaying) return;
    const autoInterval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % TOTAL_SLIDES);
    }, 3500);
    return () => clearInterval(autoInterval);
  }, [isAutoPlaying]);

  // Smooth scroll carousel container whenever activeSlide changes
  useEffect(() => {
    if (sliderRef.current) {
      const firstCard = sliderRef.current.children[0] as HTMLElement;
      if (firstCard) {
        const cardWidth = firstCard.clientWidth;
        const gap = typeof window !== 'undefined' && window.innerWidth < 640 ? 16 : 24;
        sliderRef.current.scrollTo({
          left: activeSlide * (cardWidth + gap),
          behavior: 'smooth'
        });
      }
    }
  }, [activeSlide]);

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % TOTAL_SLIDES);
  };

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
  };

  const calculateCountdown = () => {
    let targetStr = typeof window !== 'undefined' ? localStorage.getItem('rogue_24h_countdown_target') : null;
    let targetTime = targetStr ? parseInt(targetStr, 10) : 0;
    
    if (!targetTime || targetTime <= Date.now()) {
      targetTime = Date.now() + 24 * 60 * 60 * 1000;
      if (typeof window !== 'undefined') {
        localStorage.setItem('rogue_24h_countdown_target', String(targetTime));
      }
    }
    
    const difference = targetTime - Date.now();

    if (difference > 0) {
      const days = 0;
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    } else {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    }
  };

  const fetchWaitlistStats = async () => {
    try {
      const data = await apiFetch('/api/waitlist');
      if (data && typeof data.count === 'number') {
        setWaitlistCount(data.count);
      }
    } catch (err) {
      console.warn('Backend API server starting or unreachable.');
    }
  };

  const handleGooglePreRegister = () => {
    setLoading(true);
    setError('');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const activeRef = incomingRefCode || (typeof window !== 'undefined' ? localStorage.getItem('rogue_ref_code') || '' : '');
    const refQuery = activeRef ? `?ref=${encodeURIComponent(activeRef)}` : '';
    window.location.href = backendUrl ? `${backendUrl}/api/auth/google${refQuery}` : `/api/auth/google${refQuery}`;
  };

  const userRefCode = userEmail
    ? `ROGUE-${userEmail.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '')}`
    : 'ROGUE-FOUNDER';

  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=${userRefCode}`
    : `https://rogue.edu?ref=${userRefCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(userRefCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`Hey! Join me on Rogue — the exclusive platform for our campus launching Aug 20! Use my invite code ${userRefCode} to unlock your Founding Member status: ${referralUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const scrollToRegister = () => {
    document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
  };

  const CATEGORY_TABS = [
    { id: 0, label: 'Campus Feed', icon: MessageSquare, color: 'text-coral' },
    { id: 1, label: 'Fests & Clubs', icon: PartyPopper, color: 'text-teal' },
    { id: 2, label: 'Peer Discovery', icon: Heart, color: 'text-rose-400' },
    { id: 3, label: 'Blind Sync', icon: Sparkles, color: 'text-amber-300' },
    { id: 4, label: '1-on-1 Chat', icon: MessageCircle, color: 'text-purple-300' },
    { id: 5, label: 'Active Rooms', icon: Compass, color: 'text-teal' },
    { id: 6, label: 'Student Profile', icon: UserIcon, color: 'text-amber-300' }
  ];

  return (
    <div className="min-h-screen w-full max-w-full bg-[#06070B] text-white selection:bg-coral selection:text-white relative overflow-x-hidden flex flex-col justify-between font-sans pb-20 md:pb-0">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[500px] sm:h-[700px] bg-gradient-to-b from-coral/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-full max-w-[700px] h-[500px] sm:h-[700px] bg-teal/10 blur-3xl pointer-events-none -z-10" />

      {/* TOP HEADER WITH PRE-REGISTER BUTTON */}
      <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between z-30 sticky top-0 bg-[#06070B]/90 backdrop-blur-md border-b border-[#232635]/60">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-white/10 shadow-lg shadow-coral/30 flex-shrink-0">
            <img src="/logo.png" alt="Rogue" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-white font-sans">
            Rogue
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* HEADER PRE-REGISTER BUTTON ONLY */}
          <button
            onClick={scrollToRegister}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-coral hover:bg-coral-hover text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-coral/30 hover:scale-105 cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4 fill-white" /> Pre-Register
          </button>
        </div>
      </header>

      {/* MAIN HERO CONTENT */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center text-center z-10 space-y-8 sm:space-y-12">
        
        {/* SLEEK & AESTHETIC LAUNCH COUNTDOWN PILL (VERY TOP) */}
        <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 px-5 py-3 sm:py-3.5 rounded-full bg-[#0E101A]/90 border border-[#232635] shadow-2xl backdrop-blur-md max-w-full">
          <div className="flex items-center gap-2 text-xs font-mono text-coral font-semibold tracking-wider uppercase shrink-0">
            <span className="w-2 h-2 rounded-full bg-coral animate-ping shrink-0" />
            <span>Launch Countdown</span>
          </div>

          <div className="h-3 w-[1px] bg-[#232635] hidden sm:block" />

          <div className="flex items-center gap-3 font-mono text-xs text-white font-medium">
            <div className="flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-white font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-[10px] text-text-muted">h</span>
            </div>
            <span className="text-text-muted/40 font-bold">:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-white font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-[10px] text-text-muted">m</span>
            </div>
            <span className="text-text-muted/40 font-bold">:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-coral font-mono">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="text-[10px] text-coral/80">s</span>
            </div>
          </div>
        </div>

        {/* HERO HEADLINE SECTION */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15] font-fraunces">
            Bored on campus? <br />
            <span className="bg-gradient-to-r from-coral via-pink-400 to-amber-300 bg-clip-text text-transparent">
              Find your college crowd.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-text-muted max-w-xl mx-auto leading-relaxed px-1 font-normal">
            The verified social network for MITS. Anonymous posts, club updates, peer discovery, and your daily dose of campus gossip.
          </p>
        </div>

        {/* TEASER POST FEATURE CARD (FIRST!) */}
        <div id="teaser-post" className="w-full max-w-lg bg-[#0E101A] border border-[#232635] rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-5 text-left mx-auto">
          <div className="border-b border-[#1E2130] pb-3 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-coral" />
                <h3 className="text-lg font-bold text-white font-fraunces">Post your thoughts and go rogue</h3>
              </div>
              {submittedPosition || userEmail ? (
                <span className="text-[9.5px] font-mono text-teal bg-teal/10 px-2 py-0.5 rounded-full border border-teal/20 font-bold">
                  Unlocked
                </span>
              ) : (
                <span className="text-[9.5px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Pre-Register Required
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted leading-relaxed font-sans pt-1">
              "What’s a secret confession, controversial campus hot-take, or wild rumor you’d only share if no one knew it was you?"
            </p>
          </div>

          {hasTeaserPosted ? (
            <div className="bg-[#07080E] border border-teal-500/40 rounded-2xl p-5 space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-teal font-bold text-xs font-mono">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-teal" />
                <span>Post Created & Saved to Account!</span>
              </div>
              {(savedTeaserPostTitle || savedTeaserPostContent) && (
                <div className="bg-[#121422] p-3.5 rounded-xl border border-[#232635] space-y-1">
                  {savedTeaserPostTitle && (
                    <h5 className="text-xs font-bold text-white font-sans">{savedTeaserPostTitle}</h5>
                  )}
                  {savedTeaserPostContent && (
                    <p className="text-xs text-text-muted leading-relaxed font-sans">
                      "{savedTeaserPostContent}"
                    </p>
                  )}
                </div>
              )}
              <div className="p-4 bg-gradient-to-r from-teal/15 via-[#0A1D1A] to-coral/10 border border-teal/40 rounded-xl text-xs font-medium text-emerald-300 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-bold font-mono text-teal text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-teal" />
                  <span>Ready for Launch Day</span>
                </div>
                <p className="text-[11.5px] text-emerald-200/90 leading-normal">
                  Your post is safely stored under your account. It will automatically publish live to the main campus feed the moment Rogue goes live!
                </p>
              </div>
            </div>
          ) : !(submittedPosition || userEmail) ? (
            /* LOCKED FEATURE STATE FOR NON-PRE-REGISTERED VISITORS */
            <div className="bg-[#07080E] border border-amber-500/30 rounded-2xl p-6 text-center space-y-4 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400 shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Locked Feature</h4>
                <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                  Pre-register with your Google account below to unlock your 1-time early post creation for Rogue!
                </p>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" /> Pre-Register to Unlock Post Creation
              </button>
            </div>
          ) : (
            /* UNLOCKED FORM FOR PRE-REGISTERED USERS (MATCHING ROGUE BLUEPRINT) */
            <div className="space-y-4">

              {/* Post Type Selector Tabs */}
              <div className="flex bg-[#07080E] p-1 rounded-xl border border-[#232635] text-xs">
                <button
                  type="button"
                  onClick={() => setIsPollPost(false)}
                  className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !isPollPost ? 'bg-coral text-white shadow-md' : 'text-text-muted hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Standard Post
                </button>
                <button
                  type="button"
                  onClick={() => setIsPollPost(true)}
                  className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isPollPost ? 'bg-coral/20 text-coral border border-coral/40 shadow-md' : 'text-text-muted hover:text-white'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" /> Create Poll
                </button>
              </div>

              <form onSubmit={handleCreateTeaserPost} className="space-y-4">
                <div className="flex items-center justify-between bg-teal/10 border border-teal/30 rounded-xl px-3 py-2 text-xs text-teal font-mono">
                  <span className="truncate">Pre-registered: <strong>{userEmail}</strong></span>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                    {isPollPost ? 'Poll Question / Title *' : 'Post Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={teaserTitle}
                    onChange={(e) => setTeaserTitle(e.target.value)}
                    placeholder={isPollPost ? 'e.g. Which campus fest event is the best?' : "What's your post about?"}
                    className="w-full bg-[#07080E] border border-[#232635] focus:border-coral rounded-xl py-2.5 px-3.5 text-xs text-white outline-none transition-all"
                  />
                </div>



                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Content / Context *</label>
                  <textarea
                    required
                    rows={isPollPost ? 2 : 4}
                    maxLength={500}
                    value={teaserContent}
                    onChange={(e) => setTeaserContent(e.target.value)}
                    placeholder={isPollPost ? 'Add context or instructions for voters...' : 'Share details, thoughts, or ask a question...'}
                    className="w-full bg-[#07080E] border border-[#232635] focus:border-coral rounded-xl py-2.5 px-3.5 text-xs text-white outline-none resize-none transition-all"
                  />
                </div>

                {/* POLL OPTIONS CREATOR */}
                {isPollPost && (
                  <div className="space-y-3 bg-[#07080E] border border-[#232635] rounded-2xl p-3.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-coral uppercase font-mono">Poll Options</label>
                      <span className="text-[10px] text-text-muted">Min 2, Max 5 options</span>
                    </div>

                    <div className="space-y-2">
                      {pollOptions.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            value={option}
                            onChange={(e) => {
                              const newOpts = [...pollOptions];
                              newOpts[idx] = e.target.value;
                              setPollOptions(newOpts);
                            }}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 bg-[#121422] border border-[#232635] focus:border-coral rounded-xl py-2 px-3 text-xs text-white outline-none"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                              className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {pollOptions.length < 5 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions([...pollOptions, ''])}
                        className="w-full mt-1 py-1.5 border border-dashed border-[#232635] hover:border-coral/50 rounded-xl text-xs text-coral font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Option
                      </button>
                    )}

                    {/* Poll Duration Timing Selector */}
                    <div className="pt-2 border-t border-[#232635]">
                      <label className="block text-[11px] font-bold text-coral uppercase mb-1.5 font-mono">Poll Timing / Duration</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: '8h', label: '8 Hours', detail: 'Active for 8h' },
                          { id: '24h', label: '24 Hours', detail: 'Active for 24h' },
                          { id: 'always', label: 'Always', detail: 'Always Active' }
                        ].map((t) => {
                          const isSelected = pollDuration === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setPollDuration(t.id as any)}
                              className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                isSelected 
                                  ? 'bg-coral/20 border-coral text-coral shadow-md' 
                                  : 'bg-[#121422] border-[#232635] text-text-muted hover:text-white'
                              }`}
                            >
                              <span>{t.label}</span>
                              <span className="text-[9px] font-mono font-normal opacity-80">{t.detail}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ANONYMOUS POSTING TOGGLE CARD */}
                <div 
                  onClick={() => setTeaserIsAnonymous(!teaserIsAnonymous)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                    teaserIsAnonymous 
                      ? 'bg-coral/10 border-coral/50' 
                      : 'bg-[#07080E] border-[#232635] hover:border-[#34384b]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🕵️</span>
                    <div>
                      <span className="text-xs font-bold text-white block">Post Anonymously</span>
                      <span className="text-[10px] text-text-muted">Hide your name, handle, and profile link</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={teaserIsAnonymous}
                    onChange={(e) => setTeaserIsAnonymous(e.target.checked)}
                    className="w-4 h-4 accent-coral cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {teaserPostError && (
                  <p className="text-xs text-rose-400 font-mono font-bold">{teaserPostError}</p>
                )}

                <button
                  type="submit"
                  disabled={submittingTeaserPost || !teaserTitle.trim() || !teaserContent.trim()}
                  className="w-full py-3.5 px-4 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs font-bold transition-all shadow-lg shadow-coral/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submittingTeaserPost 
                      ? 'Publishing...' 
                      : isPollPost 
                      ? (teaserIsAnonymous ? 'Publish Anonymous Poll 📊' : 'Publish Poll 📊')
                      : (teaserIsAnonymous ? 'Publish Anonymous Post 🕵️' : 'Publish Post')}
                  </span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* SECTION TITLE & FEATURE SHOWCASE (NOW BELOW TEASER POST) */}
        <div className="text-center max-w-2xl mx-auto pt-6 space-y-2">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-fraunces">Everything You Need On Campus</h2>
          <p className="text-xs text-text-muted">Preview the full platform experience coming on launch day.</p>
        </div>

        {/* FEATURES SHOWCASE */}
        <div id="features" className="w-full space-y-6 pt-2">
          
          {/* SLIDING DOTS & PREV / NEXT CONTROLS AT TOP OF SHOWCASE */}
          <div className="flex items-center justify-between max-w-sm sm:max-w-md mx-auto px-2">
            <button
              onClick={handlePrevSlide}
              className="px-3.5 py-2 rounded-2xl bg-[#121422] hover:bg-[#1a1d2e] border border-[#232635] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-md hover:border-coral/50"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            {/* SLIDING DOTS */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveSlide(id);
                    setIsAutoPlaying(false);
                  }}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    activeSlide === id
                      ? 'w-6 h-2 bg-coral shadow-sm shadow-coral/50'
                      : 'w-2 h-2 bg-white/20 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNextSlide}
              className="px-3.5 py-2 rounded-2xl bg-[#121422] hover:bg-[#1a1d2e] border border-[#232635] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-md hover:border-coral/50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ACTIVE FEATURE PREVIEW CONTAINER (SINGLE FULL-WIDTH UN-CRAMPED CARD) */}
          <div 
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
            onTouchStart={() => setIsAutoPlaying(false)}
            className="w-full max-w-sm sm:max-w-md mx-auto"
          >

            {/* SLIDE 0: RICH CAMPUS FEED */}
            {activeSlide === 0 && (
              <div className="w-full bg-[#0B0C14] border border-[#232635] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between h-[520px] sm:h-[560px] text-left animate-fadeIn">
                <div className="space-y-2.5 overflow-y-auto pr-1 text-left scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                  <div className="flex items-center justify-between border-b border-[#232635] pb-2">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-coral" />
                      <span className="text-xs font-bold text-white">Verified Campus Feed</span>
                    </div>
                    <span className="text-[9px] font-mono text-teal bg-teal/10 px-2 py-0.5 rounded-full border border-teal/20">MITS Gwalior</span>
                  </div>

                  {/* POST 1: PINNED ANNOUNCEMENT */}
                  <div className="bg-[#121422] border border-amber-500/40 rounded-2xl p-3 space-y-1.5 relative shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[9px] font-mono font-bold text-amber-300">PINNED ANNOUNCEMENT</span>
                    </div>
                    <span className="text-[8px] text-text-muted">Aarunya Fest</span>
                  </div>
                  <h5 className="text-[10.5px] font-bold text-white leading-tight">Aarunya Cultural Fest Passes Released!</h5>
                  <p className="text-[9px] text-text-muted leading-relaxed">EDM Night & Battle of Bands registrations are live!</p>
                  
                  <div className="flex items-center justify-between text-[8.5px] font-mono pt-1.5 border-t border-[#232635]">
                    <div className="flex items-center gap-1">
                      <button className="px-2 py-0.5 rounded-md bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold flex items-center gap-1 cursor-pointer">
                        ▲ 142
                      </button>
                      <button className="px-1.5 py-0.5 rounded-md bg-[#181926] hover:bg-[#222436] text-text-muted border border-[#232635] cursor-pointer">
                        ▼
                      </button>
                    </div>
                    <span className="text-text-muted flex items-center gap-1">38 Comments</span>
                  </div>
                </div>

                {/* POST 2: DISCUSSION POST WITH REAL COMMENTS */}
                <div className="bg-[#121422] border border-[#232635] rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80" className="w-5 h-5 rounded-full object-cover border border-coral" />
                      <span className="text-[10px] font-bold text-white flex items-center gap-1">
                        Ananya Roy <FoundingBadge badge={{ signup_number: 1, type: 'founder', icon: 'Founder', label: 'Founder #1', tooltip: 'First student' }} size="sm" />
                      </span>
                    </div>
                    <span className="text-[8px] text-text-muted">12m ago</span>
                  </div>
                  <h5 className="text-[10.5px] font-bold text-white leading-tight">Best quiet spots to study before midterms?</h5>
                  
                  {/* REAL NESTED COMMENTS */}
                  <div className="bg-[#090A10] border border-[#1d202e] rounded-xl p-2 space-y-1">
                    <div className="text-[8px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-teal">@priya_c CSE '26</span>
                        <span className="text-[7px] text-text-muted">5m ago</span>
                      </div>
                      <p className="text-text-muted leading-snug">"3rd floor library corner near window is dead silent!"</p>
                    </div>
                    <div className="text-[8px] space-y-0.5 pt-1 border-t border-[#1d202e]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-coral">@arjun_m ECE '25</span>
                        <span className="text-[7px] text-text-muted">2m ago</span>
                      </div>
                      <p className="text-text-muted leading-snug">"CS lab 2 is open till 11 PM today if anyone needs Wi-Fi!"</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[8.5px] font-mono pt-1.5 border-t border-[#1d202e]">
                    <div className="flex items-center gap-1">
                      <button className="px-2 py-0.5 rounded-md bg-coral/10 hover:bg-coral/20 text-coral border border-coral/30 font-bold flex items-center gap-1 cursor-pointer">
                        ▲ 48
                      </button>
                      <button className="px-1.5 py-0.5 rounded-md bg-[#181926] hover:bg-[#222436] text-text-muted border border-[#232635] cursor-pointer">
                        ▼
                      </button>
                    </div>
                    <span className="text-text-muted flex items-center gap-1">14 Comments</span>
                  </div>
                </div>

                {/* POST 3: CAMPUS SPRINT */}
                <div className="bg-[#121422] border border-[#232635] rounded-2xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[9.5px]">
                    <span className="font-bold text-white">Rahul Verma</span>
                    <span className="text-[8px] text-text-muted">1h ago</span>
                  </div>
                  <p className="text-[9px] text-text-muted">Late night Canteen coding sprint starting in 15 mins!</p>
                  
                  <div className="flex items-center justify-between text-[8.5px] font-mono pt-1 border-t border-[#1d202e]">
                    <div className="flex items-center gap-1">
                      <button className="px-2 py-0.5 rounded-md bg-teal/10 text-teal border border-teal/30 font-bold flex items-center gap-1 cursor-pointer">
                        ▲ 19
                      </button>
                      <button className="px-1.5 py-0.5 rounded-md bg-[#181926] text-text-muted border border-[#232635] cursor-pointer">
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                {/* POST 4: LOST & FOUND */}
                <div className="bg-[#121422] border border-[#232635] rounded-2xl p-2 space-y-1">
                  <div className="flex items-center justify-between text-[9.5px]">
                    <span className="font-bold text-teal">Sneha Patel • Mech Block</span>
                    <span className="text-[8px] text-text-muted">2h ago</span>
                  </div>
                  <p className="text-[9px] text-text-muted">🎒 Found a black AirPods case in Mech Audi floor. DM me to claim!</p>
                </div>
              </div>

                <span className="text-xs font-bold text-center text-coral pt-2 block">1. Verified Campus Feed</span>
              </div>
            )}

            {/* SLIDE 1: CLUB & FEST UPDATES */}
            {activeSlide === 1 && (
              <div className="w-full bg-[#0B0C14] border border-[#232635] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between h-[520px] sm:h-[560px] text-left animate-fadeIn">
                <div className="space-y-2 overflow-y-auto pr-1 text-left scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                <div className="flex items-center justify-between border-b border-[#232635] pb-2">
                  <div className="flex items-center gap-1.5">
                    <BellRing className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">College & Club Updates</span>
                  </div>
                  <span className="text-[9px] font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">5 Live Announcements</span>
                </div>

                {/* Card 1: Aarunya Fest */}
                <div className="bg-gradient-to-br from-amber-500/15 via-coral/10 to-purple-600/15 border border-amber-500/40 rounded-2xl p-3 space-y-1.5 shadow-lg">
                  <div className="flex items-center justify-between text-[8.5px] font-mono text-amber-300 font-bold">
                    <span className="flex items-center gap-1"><PartyPopper className="w-3 h-3 text-amber-400" /> AARUNYA 2026 FEST</span>
                    <span className="bg-amber-400/20 px-1.5 py-0.5 rounded">OCT 24-26</span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-tight">Annual Cultural Fest Registrations Open</h4>
                  <p className="text-[9.5px] text-text-muted leading-relaxed">EDM Night, Battle of Bands & Drama passes are live. Claim yours now!</p>
                  <div className="flex items-center justify-between pt-0.5 text-[8.5px] font-mono">
                    <span className="text-amber-400 font-bold">1,240 Passes Claimed</span>
                    <span className="text-teal">Official Fest News</span>
                  </div>
                </div>

                {/* Card 2: Tech Club */}
                <div className="bg-[#121422] border border-[#232635] rounded-2xl p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[8.5px] font-mono">
                    <span className="text-coral font-bold">Tech Club • Hackathon</span>
                    <span className="text-text-muted">Today 4:00 PM</span>
                  </div>
                  <h5 className="text-[10.5px] font-bold text-white">Smart India Hackathon Team Selection</h5>
                  <p className="text-[9px] text-text-muted leading-relaxed">Auditions for 4-member teams in Audi-2 at 5 PM sharp.</p>
                </div>

                {/* Card 3: E-Cell Pitch Fest */}
                <div className="bg-[#121422] border border-[#232635] rounded-2xl p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[8.5px] font-mono">
                    <span className="text-teal font-bold">E-Cell • Pitch Fest</span>
                    <span className="text-text-muted">Tomorrow 2 PM</span>
                  </div>
                  <h5 className="text-[10.5px] font-bold text-white">Campus Startup Pitch Fest '26</h5>
                  <p className="text-[9px] text-text-muted leading-relaxed">₹50,000 seed grant pool for top 3 student startup ideas.</p>
                </div>

                {/* Card 4: Music Club */}
                <div className="bg-[#121422] border border-[#232635] rounded-2xl p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[8.5px] font-mono">
                    <span className="text-purple-300 font-bold">Music Club • Acoustic Night</span>
                    <span className="text-text-muted">Fri 6:30 PM</span>
                  </div>
                  <h5 className="text-[10.5px] font-bold text-white">Open Air Theater Jamming Session</h5>
                  <p className="text-[9px] text-text-muted leading-relaxed">Bring your instruments or just come enjoy live campus acoustic tunes.</p>
                </div>

                {/* Card 5: Sports Club */}
                <div className="bg-[#121422] border border-[#232635] rounded-2xl p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[8.5px] font-mono">
                    <span className="text-amber-300 font-bold">Sports Club • Football</span>
                    <span className="text-text-muted">Sat 9:00 AM</span>
                  </div>
                  <h5 className="text-[10.5px] font-bold text-white">Inter-Branch Football Tournament</h5>
                  <p className="text-[9px] text-text-muted leading-relaxed">Branch team registrations close Friday evening at Sports Complex.</p>
                </div>
              </div>

                <span className="text-xs font-bold text-center text-amber-300 pt-2 block">2. Club & Fest Updates</span>
              </div>
            )}

            {/* SLIDE 2: DISCOVER PEERS */}
            {activeSlide === 2 && (
              <div className="w-full bg-[#0B0C14] border border-[#232635] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between h-[520px] sm:h-[560px] text-left animate-fadeIn">
                <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#232635] pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-coral" />
                    <span className="text-xs font-bold text-white">Discover Peers</span>
                  </div>
                  <span className="text-[9px] font-mono text-teal bg-teal/10 px-2 py-0.5 rounded-full border border-teal/20">Swipe Mode</span>
                </div>

                {/* DATING APP STYLE SWIPE CARD */}
                <div className="relative bg-[#121422] border border-[#232635] rounded-2xl overflow-hidden shadow-2xl h-[380px] flex flex-col justify-between p-3">
                  <div className="absolute top-4 right-4 z-20 bg-teal/20 border-2 border-teal text-teal font-extrabold text-xs px-3 py-1 rounded-xl rotate-12 shadow-lg">
                    SWIPE RIGHT
                  </div>

                  <div className="absolute inset-0 z-0">
                    <img 
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80" 
                      className="w-full h-full object-cover opacity-80" 
                      alt="Student Profile"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C14] via-black/40 to-transparent" />
                  </div>

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[9px] font-mono bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white font-bold border border-white/10">
                      B.Tech CSE '26
                    </span>
                    <FoundingBadge badge={{ signup_number: 4, type: 'early_star', icon: 'Star', label: 'Early Star #4', tooltip: 'Top 10 member' }} size="sm" />
                  </div>

                  <div className="relative z-10 space-y-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-1">
                        Pooja Sharma, 20 <ShieldCheck className="w-3.5 h-3.5 text-teal" />
                      </h4>
                      <p className="text-[10px] text-lavender">"Building AI startup • Hackathon enthusiast • Indie music fanatic"</p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-coral text-white font-bold">#Coding</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold">#Hackathons</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-teal text-white font-bold">#Music</span>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-2">
                      <div className="w-10 h-10 rounded-full bg-black/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-lg cursor-pointer hover:scale-110 transition-transform">
                        <X className="w-5 h-5" />
                      </div>
                      <div className="w-12 h-12 rounded-full bg-teal flex items-center justify-center text-white shadow-lg shadow-teal/30 cursor-pointer hover:scale-110 transition-transform">
                        <Heart className="w-6 h-6 fill-white" />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-black/80 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-lg cursor-pointer hover:scale-110 transition-transform">
                        <Star className="w-5 h-5 fill-amber-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                <span className="text-xs font-bold text-center text-teal pt-2 block">3. Swipe Discover Feature</span>
              </div>
            )}

            {/* SLIDE 3: WEEKLY BLIND PEER SYNC */}
            {activeSlide === 3 && (
              <div className="w-full bg-[#0B0C14] border border-[#232635] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between h-[520px] sm:h-[560px] text-left animate-fadeIn">
                <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#232635] pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Shuffle className="w-4 h-4 text-coral" />
                    <span className="text-xs font-bold text-white">Weekly Match</span>
                  </div>
                  <span className="text-[9px] font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">Sun 12:00 AM</span>
                </div>

                <div className="bg-gradient-to-b from-[#181A2A] to-[#0B0C14] border border-coral/40 rounded-2xl p-4 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    <span className="text-teal font-bold">98% Compatibility Match</span>
                    <span className="text-text-muted">MITS Gwalior</span>
                  </div>

                  <div className="text-center space-y-1.5">
                    <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80" className="w-14 h-14 rounded-full object-cover mx-auto border-2 border-coral" />
                    <h5 className="text-xs font-bold text-white">Rahul Verma</h5>
                    <p className="text-[9px] text-text-muted">B.Tech CSE '26 • AI & ML</p>
                  </div>

                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-coral/20 text-coral border border-coral/30">#Coding</span>
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">#Hackathons</span>
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-teal/20 text-teal border border-teal/30">#Gaming</span>
                  </div>

                  <button className="w-full py-2.5 bg-coral hover:bg-coral-hover text-white text-[10px] font-bold rounded-xl shadow-md">
                    Say Hi (Icebreaker Active)
                  </button>
                </div>
              </div>

                <span className="text-xs font-bold text-center text-coral pt-2 block">4. Weekly Blind Peer Match</span>
              </div>
            )}

            {/* SLIDE 4: 1-ON-1 DIRECT MESSAGING */}
            {activeSlide === 4 && (
              <div className="w-full bg-[#0B0C14] border border-[#232635] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between h-[520px] sm:h-[560px] text-left animate-fadeIn">
                <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#232635] pb-2">
                  <div className="flex items-center gap-2">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80" className="w-6 h-6 rounded-full object-cover" />
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        Ananya Roy <FoundingBadge badge={{ signup_number: 1, type: 'founder', icon: 'Founder', label: 'Founder #1', tooltip: 'First student' }} size="sm" />
                      </span>
                    </div>
                  </div>
                  <span className="text-[8.5px] text-teal font-mono">● Online</span>
                </div>

                <div className="space-y-2 text-[9.5px]">
                  <div className="bg-[#121422] border border-[#232635] rounded-2xl p-2 max-w-[85%] text-white space-y-0.5">
                    <p>Hey! Did you check out the Smart India Hackathon problem statements?</p>
                    <span className="text-[7.5px] text-text-muted block text-right">9:38 AM</span>
                  </div>

                  <div className="bg-coral text-white rounded-2xl p-2 max-w-[85%] ml-auto space-y-0.5">
                    <p>Yeah! The AI track looks awesome. Are you building a team?</p>
                    <span className="text-[7.5px] text-white/70 block text-right">9:40 AM</span>
                  </div>

                  <div className="bg-[#121422] border border-[#232635] rounded-2xl p-2 max-w-[85%] text-white space-y-0.5">
                    <p>Yes! We need one more backend dev. Want to sync today?</p>
                    <span className="text-[7.5px] text-text-muted block text-right">9:41 AM</span>
                  </div>

                  <div className="bg-coral text-white rounded-2xl p-2 max-w-[85%] ml-auto space-y-0.5">
                    <p>Count me in! I've built Node.js & React apps. Where are you sitting?</p>
                    <span className="text-[7.5px] text-white/70 block text-right">9:42 AM</span>
                  </div>

                  <div className="bg-[#121422] border border-[#232635] rounded-2xl p-2 max-w-[85%] text-white space-y-0.5">
                    <p>Canteen table 4! Grabbed Aarunya fest passes too</p>
                    <span className="text-[7.5px] text-text-muted block text-right">9:43 AM</span>
                  </div>

                  <div className="text-[8px] text-text-muted italic flex items-center gap-1 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-coral" /> Ananya is typing...
                  </div>
                </div>
              </div>

              <div className="bg-[#121422] border border-[#232635] p-2 flex items-center justify-between rounded-xl">
                <span className="text-[10px] text-text-muted">Type a message...</span>
                <div className="w-6 h-6 rounded-lg bg-coral flex items-center justify-center text-white">
                  <Send className="w-3 h-3" />
                </div>
              </div>

                <span className="text-xs font-bold text-center text-purple-300 pt-2 block">5. 1-on-1 Direct Chat</span>
              </div>
            )}

            {/* SLIDE 5: INTEREST CHAT ROOMS */}
            {activeSlide === 5 && (
              <div className="w-full bg-[#0B0C14] border border-[#232635] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between h-[520px] sm:h-[560px] text-left animate-fadeIn">
                <div className="space-y-2 overflow-y-auto pr-1 text-left scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                <div className="flex items-center justify-between border-b border-[#232635] pb-2">
                  <span className="text-xs font-bold text-white">Campus Rooms</span>
                  <span className="text-[9px] font-mono text-teal">● 6 Active Hubs</span>
                </div>

                <div className="space-y-1.5">
                  <div className="bg-[#121422] border border-[#232635] rounded-xl p-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-white">Hackathon Hub</span>
                      <span className="text-[7.5px] font-mono text-teal bg-teal/10 px-1.5 py-0.5 rounded-full">24 Online</span>
                    </div>
                    <p className="text-[8.5px] text-text-muted">Aarav: Anyone building for Smart India Hackathon?</p>
                  </div>

                  <div className="bg-[#121422] border border-[#232635] rounded-xl p-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-white">Coding Club</span>
                      <span className="text-[7.5px] font-mono text-coral bg-coral/10 px-1.5 py-0.5 rounded-full">18 Online</span>
                    </div>
                    <p className="text-[8.5px] text-text-muted">Priya: Solved today's Leetcode Daily!</p>
                  </div>

                  <div className="bg-[#121422] border border-[#232635] rounded-xl p-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-white">Anime & Manga</span>
                      <span className="text-[7.5px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded-full">31 Online</span>
                    </div>
                    <p className="text-[8.5px] text-text-muted">Rohan: New Demon Slayer episode is peak!</p>
                  </div>

                  <div className="bg-[#121422] border border-[#232635] rounded-xl p-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-white">Gaming & E-Sports</span>
                      <span className="text-[7.5px] font-mono text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded-full">42 Online</span>
                    </div>
                    <p className="text-[8.5px] text-text-muted">Kabir: Valorant 5v5 custom lobby tonight at 10!</p>
                  </div>

                  <div className="bg-[#121422] border border-[#232635] rounded-xl p-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-white">Music & Jamming</span>
                      <span className="text-[7.5px] font-mono text-teal bg-teal/10 px-1.5 py-0.5 rounded-full">15 Online</span>
                    </div>
                    <p className="text-[8.5px] text-text-muted">Neha: Jamming at OAT open lawn right now</p>
                  </div>

                  <div className="bg-[#121422] border border-[#232635] rounded-xl p-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-white">AI & ML Research</span>
                      <span className="text-[7.5px] font-mono text-coral bg-coral/10 px-1.5 py-0.5 rounded-full">29 Online</span>
                    </div>
                    <p className="text-[8.5px] text-text-muted">Vikram: Paper discussion on DeepSeek AI</p>
                  </div>
                </div>
              </div>

                <span className="text-xs font-bold text-center text-teal pt-2 block">6. Interest Chat Rooms</span>
              </div>
            )}

            {/* SLIDE 6: STUDENT PROFILE */}
            {activeSlide === 6 && (
              <div className="w-full bg-[#0B0C14] border border-[#232635] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between h-[520px] sm:h-[560px] text-left animate-fadeIn">
                <div className="space-y-2.5 overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#232635] pb-2">
                  <span className="text-xs font-bold text-white">Student Profile</span>
                  <span className="text-[9px] font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">Verified Student</span>
                </div>

                {/* Profile Header */}
                <div className="bg-[#121422] border border-[#232635] rounded-2xl p-3 space-y-2 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80" className="w-12 h-12 rounded-full object-cover border-2 border-coral shadow-lg" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-teal flex items-center justify-center text-white text-[8px] border border-black font-bold">✓</div>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white flex items-center gap-1">
                        Ananya Roy <ShieldCheck className="w-3.5 h-3.5 text-teal" />
                      </h5>
                      <p className="text-[9px] text-coral font-mono">@ananya_roy • CSE '26</p>
                      <span className="text-[8px] text-text-muted block">MITS Gwalior</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-text-muted leading-relaxed italic">"Building AI startups • Hackathon enthusiast • Music addict"</p>

                  {/* Profile Metrics */}
                  <div className="bg-[#090A10] border border-[#1d202e] rounded-xl p-2 flex items-center justify-between text-[9px] text-text-muted text-center font-mono">
                    <div><span className="block font-bold text-white text-xs">142</span> Followers</div>
                    <div><span className="block font-bold text-white text-xs">38</span> Posts</div>
                    <div><span className="block font-bold text-white text-xs">5</span> Badges</div>
                    <div><span className="block font-bold text-teal text-xs">98%</span> Karma</div>
                  </div>

                  {/* Badges Cabinet */}
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-amber-300 font-bold uppercase tracking-wider block">BADGES</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <FoundingBadge badge={{ signup_number: 1, type: 'founder', icon: 'Founder', label: 'Founder #1', tooltip: 'First student' }} size="sm" />
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[8px] font-mono font-bold">14-Day Streak</span>
                    </div>
                  </div>
                </div>

                {/* MY RECENT POSTS SECTION */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white font-bold flex items-center gap-1">
                      <FileText className="w-3 h-3 text-coral" /> MY RECENT POSTS
                    </span>
                    <span className="text-[8px] text-coral font-mono font-bold">View All 38 →</span>
                  </div>

                  {/* User Post 1 */}
                  <div className="bg-[#121422] border border-[#232635] rounded-xl p-2 space-y-1">
                    <h6 className="text-[9.5px] font-bold text-white leading-tight">Best quiet spots to study before midterms?</h6>
                    <div className="flex items-center justify-between text-[8px] text-text-muted font-mono">
                      <span className="text-coral font-bold">▲ 48 Upvotes</span>
                      <span>💬 14 Comments</span>
                    </div>
                  </div>

                  {/* User Post 2 */}
                  <div className="bg-[#121422] border border-[#232635] rounded-xl p-2 space-y-1">
                    <h6 className="text-[9.5px] font-bold text-white leading-tight">Built a mini React component library over the weekend! 🚀</h6>
                    <div className="flex items-center justify-between text-[8px] text-text-muted font-mono">
                      <span className="text-teal font-bold">▲ 62 Upvotes</span>
                      <span>💬 9 Comments</span>
                    </div>
                  </div>
                </div>
              </div>

                <span className="text-xs font-bold text-center text-amber-300 pt-2 block">7. Profile & Published Posts</span>
              </div>
            )}

          </div>
        </div>



        {/* GOOGLE LOGIN ONLY PRE-REGISTRATION CARD (VERY BOTTOM) */}
        <div id="register" className="w-full max-w-lg bg-[#0F1018] border border-[#232635] rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6 scroll-mt-24">
          
          {submittedPosition ? (
            /* SUCCESS CONFIRMATION & VIRAL REFERRAL HUB */
            <div className="space-y-6 animate-fadeIn text-left">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-teal/20 border border-teal/40 rounded-2xl flex items-center justify-center mx-auto text-teal shadow-lg shadow-teal/20">
                  <Check className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white font-fraunces">You're On The List!</h3>
                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                    You're officially on the campus waitlist!
                  </p>
                </div>
              </div>

              {/* CLAIM YOUR CAMPUS @HANDLE BOX */}
              <div className="bg-[#06070B] border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3 relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">Reserve Your Rogue @Handle</h4>
                  </div>
                  {claimedHandle && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Reserved
                    </span>
                  )}
                </div>

                {/* PERSONAL EMAIL NUDGE — shown inline where user is choosing handle */}
                {isPersonalEmailUser && (
                  <div className="flex items-start gap-2 bg-amber-400/8 border border-amber-400/25 rounded-xl px-3 py-2.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-200 leading-relaxed">
                      <span className="font-bold text-amber-300">You're in!</span> Log in with your{' '}
                      <span className="font-semibold text-amber-100">college email (.ac.in / .edu)</span> to get full verified access when we launch.
                    </p>
                  </div>
                )}
                {claimedHandle ? (
                  <div className="bg-[#0E101A] border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-text-muted block">Your Official Reserved Handle</span>
                      <span className="text-base font-mono font-bold text-emerald-400">@{claimedHandle}</span>
                    </div>
                    <button
                      onClick={() => setClaimedHandle('')}
                      className="text-[11px] text-text-muted hover:text-white underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleClaimHandle} className="space-y-2.5">
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Lock your preferred username now so nobody else in your campus can take it.
                    </p>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-xs font-mono text-amber-400 font-bold">@</span>
                        <input
                          type="text"
                          placeholder="your_handle"
                          value={handleInput}
                          onChange={(e) => setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          maxLength={20}
                          className="w-full bg-[#0E101A] border border-[#232635] rounded-xl py-2 pl-7 pr-3 text-xs font-mono text-white placeholder-text-muted/50 outline-none focus:border-amber-400 transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={claimingHandle || !handleInput.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {claimingHandle ? 'Checking...' : 'Reserve'}
                      </button>
                    </div>

                    {handleError && (
                      <p className="text-[11px] text-rose-400 font-mono font-bold">{handleError}</p>
                    )}

                    {handleSuccess && (
                      <p className="text-[11px] text-emerald-400 font-mono font-bold">{handleSuccess}</p>
                    )}
                  </form>
                )}
              </div>



              {/* PERSONAL REFERRAL CODE & LINK HUB */}
              <div className="bg-[#06070B] border border-[#1E2130] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-text-muted uppercase tracking-wider">
                    Invite Link & Code
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                    Active
                  </span>
                </div>

                {/* REFERRAL CODE DISPLAY BOX */}
                <div className="flex items-center gap-2 bg-[#0E101A] border border-[#1E2130] rounded-xl p-2.5">
                  <span className="text-sm sm:text-base font-mono font-semibold text-white tracking-wider px-2 select-all flex-1">
                    {userRefCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-lg bg-[#181A2A] hover:bg-[#22253B] border border-[#232635] text-white text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* 1-CLICK SHARE ACTIONS (WHATSAPP + COPY LINK) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2.5 px-3 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Link Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Invite Link
                      </>
                    )}
                  </button>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Hey! I just pre-registered for Rogue — our official campus network launching Aug 20! 🚀 Pre-register using my code ${userRefCode} to unlock Founding Member access: ${referralUrl}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-[#25D366]" /> Share on WhatsApp
                  </a>
                </div>
              </div>


            </div>
          ) : (
            /* GOOGLE OAUTH ONLY SIGNUP */
            <div className="space-y-5 text-center">
              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-white font-fraunces">Pre-Register with College Email</h3>
              </div>

              {/* ACTIVE REFERRAL BANNER IF REFERRED */}
              {incomingRefCode && (
                <div className="p-3 rounded-xl bg-teal/10 border border-teal/30 text-teal text-xs font-mono font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-teal" /> Invite Code Active:
                  </span>
                  <span className="bg-teal/20 px-2 py-0.5 rounded text-white">{incomingRefCode}</span>
                </div>
              )}



              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                  {error}
                </div>
              )}

              {/* SINGLE GOOGLE PRE-REGISTER BUTTON */}
              <button
                type="button"
                onClick={handleGooglePreRegister}
                disabled={loading}
                className="w-full py-4 px-4 sm:px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-extrabold transition-all shadow-2xl flex items-center justify-center gap-3 cursor-pointer group hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span>Connecting to Google Account...</span>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="truncate">Pre-Register with Google</span>
                  </>
                )}
              </button>



            </div>
          )}

        </div>

      </main>



      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto w-full px-6 py-8 border-t border-[#232635]/60 flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-4 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <ShieldCheck className="w-4 h-4 text-text-muted" />
          <span>Strictly Gated to Verified Academic Emails</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
          <p className="text-center">© 2026 Rogue. Built for students, by students.</p>
        </div>
      </footer>

      {/* STORY CARD MODAL */}
      <StoryCardModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        defaultHandle={claimedHandle}
        position={submittedPosition}
        userEmail={userEmail}
        isLoggedIn={Boolean(userEmail && userEmail.trim().length > 0)}
        onLoginRedirect={handleGooglePreRegister}
      />

    </div>
  );
}
