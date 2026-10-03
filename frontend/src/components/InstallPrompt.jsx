import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

// Listens for the browser's beforeinstallprompt event and shows a native install banner.
// Dismissed state is persisted in localStorage so it doesn't nag on every visit.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or already installed (standalone)
    const dismissed = localStorage.getItem('finlit_pwa_install_dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;

    if (dismissed || isStandalone) return;

    const handler = (e) => {
      // Prevent the default mini-infobar on mobile Chrome
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('finlit_pwa_install_dismissed', '1');
  };

  if (!showBanner) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50
        bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl
        border border-gray-700 dark:border-gray-600
        p-4 flex items-center space-x-3 animate-in slide-in-from-bottom duration-300"
    >
      {/* App icon */}
      <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/40">
        <Download className="w-5 h-5 text-white" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-white leading-tight">Install FinLit</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-tight">Add to home screen for the full app experience</p>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95
            text-white font-bold text-xs rounded-xl transition shadow-md"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
