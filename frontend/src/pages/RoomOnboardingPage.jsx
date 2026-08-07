import { useState, useEffect } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { Home, Key, ArrowRight, ShieldCheck, Search, Check } from 'lucide-react';
import api from '../api/axiosConfig';

export default function RoomOnboardingPage({ onSuccess }) {
  const { createRoom, joinRoom, recoverRoom, isLoading, error } = useRoomStore();

  const [mode, setMode] = useState('choose'); // 'choose', 'create', 'join', 'recover'
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [previewedRoom, setPreviewedRoom] = useState(null);

  // Auto-detect URL parameter ?joinCode=... or ?code=...
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('joinCode') || urlParams.get('code') || urlParams.get('flat');
    if (codeFromUrl) {
      setJoinInput(codeFromUrl);
      setMode('join');
      fetchPreview(codeFromUrl);
    }
  }, []);

  const fetchPreview = async (query) => {
    if (!query || query.trim().length < 2) {
      setPreviewedRoom(null);
      return;
    }
    try {
      const res = await api.get(`/rooms/preview/${encodeURIComponent(query.trim())}`);
      setPreviewedRoom(res.data.room);
    } catch {
      setPreviewedRoom(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !roomName.trim()) return;
    const res = await createRoom(roomName.trim(), name.trim());
    if (res?.success && onSuccess) {
      onSuccess();
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !joinInput.trim()) return;
    const res = await joinRoom(joinInput.trim(), name.trim());
    if (res?.success && onSuccess) {
      onSuccess();
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    if (!recoveryCode.trim()) return;
    const res = await recoverRoom(recoveryCode.trim());
    if (res?.success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center items-center p-4">
      {/* Brand Header */}
      <div className="text-center max-w-md mb-8">
        <div className="inline-flex items-center justify-center p-3.5 bg-emerald-600 text-white rounded-3xl shadow-lg shadow-emerald-600/30 mb-4">
          <Home className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          FinLit
        </h1>
        <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-widest">
          Spend. Split. Forget.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Zero-friction expense tracking for flatmates, trips, and shared households.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 dark:border-gray-800 transition-all">
        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 text-center">
            {error}
          </div>
        )}

        {/* Choice Mode */}
        {mode === 'choose' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full p-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/25 transition text-left flex items-center justify-between group"
            >
              <div>
                <span className="text-base font-extrabold block">Create New Group / Flat</span>
                <span className="text-xs text-emerald-100 font-normal">Start a new room for your flat or trip</span>
              </div>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full p-5 bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-2xl font-bold transition text-left flex items-center justify-between group"
            >
              <div>
                <span className="text-base font-extrabold block">Join Group / Flat</span>
                <span className="text-xs text-gray-400 font-normal">Join by Flat Name or Room Code</span>
              </div>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
              <button
                onClick={() => setMode('recover')}
                className="text-xs text-gray-500 dark:text-gray-400 font-semibold hover:text-emerald-600 flex items-center justify-center mx-auto space-x-1"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Recover Existing Room Identity</span>
              </button>
            </div>
          </div>
        )}

        {/* Create Room Form */}
        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Group / Flat</h2>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Your Name
              </label>
              <input
                type="text"
                placeholder="e.g. Akshay"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Flat or Trip Name
              </label>
              <input
                type="text"
                placeholder="e.g. Flat 302 or Goa Trip"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-lg text-sm transition disabled:opacity-50"
            >
              {isLoading ? 'Creating Room...' : 'Create Room'}
            </button>

            <button
              type="button"
              onClick={() => setMode('choose')}
              className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 pt-2"
            >
              ← Back
            </button>
          </form>
        )}

        {/* Join Room Form: Simple, Clean, Universal */}
        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Join Group / Flat</h2>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Your Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Flat Name or Room Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Flat 302  OR  FLAT-7X92"
                  value={joinInput}
                  onChange={(e) => {
                    setJoinInput(e.target.value);
                    fetchPreview(e.target.value);
                  }}
                  required
                  className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Type the flat name (e.g., "Flat 302") or room code (e.g., "FLAT-BAXX")
              </p>
            </div>

            {/* Room Found Preview Badge */}
            {previewedRoom && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                    Found Room: {previewedRoom.name}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium">
                    Code: {previewedRoom.joinCode} • {previewedRoom.memberCount} members
                  </p>
                </div>
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !joinInput.trim()}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-lg text-sm transition disabled:opacity-50"
            >
              {isLoading ? 'Joining Room...' : 'Join Room'}
            </button>

            <button
              type="button"
              onClick={() => setMode('choose')}
              className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 pt-2"
            >
              ← Back
            </button>
          </form>
        )}

        {/* Recover Form */}
        {mode === 'recover' && (
          <form onSubmit={handleRecover} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recover Identity</h2>
            <p className="text-xs text-gray-500">Enter your 8-character recovery key (e.g. X7K9-P2Q8)</p>

            <div>
              <input
                type="text"
                placeholder="X7K9-P2Q8"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono font-bold tracking-widest text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-lg text-sm transition disabled:opacity-50"
            >
              {isLoading ? 'Recovering...' : 'Restore Access'}
            </button>

            <button
              type="button"
              onClick={() => setMode('choose')}
              className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 pt-2"
            >
              ← Back
            </button>
          </form>
        )}
      </div>

      {/* Zero Friction Guarantee */}
      <div className="mt-8 text-center flex items-center space-x-1.5 text-xs text-gray-400 font-semibold">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>No email or password required. Identity stored securely on device.</span>
      </div>
    </div>
  );
}
