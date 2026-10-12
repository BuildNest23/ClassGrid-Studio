import React, { useState, useEffect, useRef } from 'react';
import { useClassroom } from '../context/ClassroomContext';
import {
  Undo2,
  Redo2,
  Sun,
  Moon,
  HelpCircle,
  Download,
  Share,
  X
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface HeaderProps {
  activeViewTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ activeViewTitle }) => {
  const {
    data,
    darkMode,
    toggleDarkMode,
    changeTableSize,
    openHelp,
    undo,
    redo,
    canUndo,
    canRedo,
    isSavedFlashing
  } = useClassroom();

  const [showInstallModal, setShowInstallModal] = useState<'ios' | 'other' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [hiddenOnScroll, setHiddenOnScroll] = useState(false);
  const lastYRef = useRef(0);
  const hiddenRef = useRef(false);

  // Mobile only: hide header when scrolling down, show again when scrolling up.
  useEffect(() => {
    const setHidden = (v: boolean) => {
      if (hiddenRef.current !== v) {
        hiddenRef.current = v;
        setHiddenOnScroll(v);
      }
    };
    const onScroll = () => {
      if (window.innerWidth > 800) {
        setHidden(false);
        lastYRef.current = window.scrollY;
        return;
      }
      const y = window.scrollY;
      const lastY = lastYRef.current;
      if (y <= 10) setHidden(false);
      else if (y > 80 && y > lastY + 6) setHidden(true);
      else if (y < lastY - 6) setHidden(false);
      lastYRef.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setShowInstallButton(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      setShowInstallButton(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      setShowInstallModal('ios');
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        setShowInstallButton(false);
      });
    } else {
      setShowInstallModal('other');
    }
  };

  const displaySubtitle = activeViewTitle
    ? activeViewTitle
    : data.className
    ? `${data.className}${data.inchargeName ? ` · ${data.inchargeName}` : ''}`
    : 'Classroom Administration';

  return (
    <header className={`sticky top-0 z-30 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 pt-safe transition-[transform,background-color,border-color] duration-250 ${hiddenOnScroll ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className="flex items-center justify-between gap-3 px-3.5 sm:px-6 h-14 max-w-7xl mx-auto">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-red-800 dark:bg-red-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
            CG
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 truncate flex items-center gap-2">
              ClassGrid
              <span className="hidden md:inline-block text-xs font-medium text-stone-400">·</span>
              <span className="hidden md:inline-block text-xs font-semibold text-red-800 dark:text-red-400 truncate max-w-xs">
                {displaySubtitle}
              </span>
            </h1>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Saved Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
              isSavedFlashing
                ? 'bg-red-700 text-white scale-105 shadow-xs'
                : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300'
            }`}
            title="All changes are automatically saved offline on your device"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" />
            <span className="text-[11px] font-semibold">Saved</span>
          </div>

          {/* Grouped Undo / Redo */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 sm:p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-lg active:bg-stone-200 dark:active:bg-stone-700 transition"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 sm:p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-lg active:bg-stone-200 dark:active:bg-stone-700 transition"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Table text zoom buttons (desktop) */}
          <div className="hidden md:flex items-center bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => changeTableSize(-1)}
              title="Smaller table text"
              className="px-2 py-1 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white rounded-lg active:bg-stone-200 dark:active:bg-stone-700 transition"
            >
              A−
            </button>
            <button
              type="button"
              onClick={() => changeTableSize(1)}
              title="Bigger table text"
              className="px-2 py-1 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white rounded-lg active:bg-stone-200 dark:active:bg-stone-700 transition"
            >
              A+
            </button>
          </div>

          {/* Install PWA Button if available */}
          {showInstallButton && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
              title="Install ClassGrid as an app"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Dark Mode toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-95 transition"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Guide & Help */}
          <button
            type="button"
            onClick={openHelp}
            className="p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-95 transition"
            title="User Guide & Help"
            aria-label="Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Install Helper Dialog */}
      {showInstallModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[max(1rem,calc(var(--safe-top,env(safe-area-inset-top,0px))+0.75rem))] pb-[max(1rem,calc(var(--safe-bottom,env(safe-area-inset-bottom,0px))+0.75rem))] bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowInstallModal(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 rounded-xl">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Install ClassGrid
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(null)}
                className="p-1.5 -mr-1.5 -mt-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-full"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showInstallModal === 'ios' ? (
              <>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
                  On iPhone and iPad, web apps are installed from <b>Safari</b>:
                </p>
                <ol className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed space-y-2 mb-4 list-decimal pl-5">
                  <li>
                    Tap the <b>Share</b> button
                    <span className="inline-flex items-center justify-center align-middle mx-1 px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded-md">
                      <Share className="w-3 h-3" />
                    </span>
                    in Safari&apos;s toolbar.
                  </li>
                  <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
                  <li>Tap <b>Add</b> in the top-right corner.</li>
                </ol>
              </>
            ) : (
              <>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
                  Install ClassGrid for one-tap offline access:
                </p>
                <ul className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed space-y-2 mb-4 list-disc pl-5">
                  <li><b>Chrome / Edge:</b> Click the install icon in the URL address bar or browser menu.</li>
                  <li><b>Android:</b> Tap three dots ⋮ → <b>Install app</b>.</li>
                </ul>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowInstallModal(null)}
              className="w-full mt-4 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
