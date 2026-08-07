import { useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { Copy, Check, Users, Key, Plus, ChevronRight, Layers, UserX, RefreshCw, LogOut } from 'lucide-react';
import api from '../api/axiosConfig';
import RecurringBillsCard from './RecurringBillsCard';

export default function RoomView({ onOpenNewRoomOnboarding }) {
  const {
    room,
    currentMember,
    members,
    balances,
    recoveryCode,
    myRooms,
    switchRoom,
    leaveRoom,
    removeMember,
    fetchRoomDetails,
  } = useRoomStore();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showMultiGroupDrawer, setShowMultiGroupDrawer] = useState(false);

  const { allMemberBalances } = balances || {};

  const handleCopyJoinCode = () => {
    if (room?.joinCode) {
      navigator.clipboard.writeText(room.joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyRecoveryCode = () => {
    if (recoveryCode) {
      navigator.clipboard.writeText(recoveryCode);
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (!room) return;
    setIsRegenerating(true);
    try {
      await api.patch(`/rooms/${room.id || room._id}/join-code`);
      await fetchRoomDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRemoveMember = async (targetMemberId, targetName) => {
    if (window.confirm(`Are you sure you want to remove "${targetName}" from this room?`)) {
      await removeMember(targetMemberId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Group Switcher Banner */}
      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-3xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-2xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-300">Active Group / Trip</p>
            <p className="text-base font-black text-white">{room?.name}</p>
          </div>
        </div>

        <button
          onClick={() => setShowMultiGroupDrawer(!showMultiGroupDrawer)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
        >
          <span>Switch / Add</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Multi-Group Switcher Modal */}
      {showMultiGroupDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Your Groups & Trips ({myRooms.length})</h3>
              <button
                onClick={() => setShowMultiGroupDrawer(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-60 overflow-y-auto">
              {myRooms.map((entry) => {
                const isCurrent = (entry.room.id || entry.room._id) === (room.id || room._id);
                return (
                  <div
                    key={entry.room.id || entry.room._id}
                    className="py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 rounded-xl"
                  >
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center">
                        <span>{entry.room.name}</span>
                        {isCurrent && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>}
                      </p>
                      <p className="text-xs text-gray-400">Code: {entry.room.joinCode} • {entry.member.name}</p>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => {
                          switchRoom(entry.room.id || entry.room._id);
                          setShowMultiGroupDrawer(false);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowMultiGroupDrawer(false);
                  if (onOpenNewRoomOnboarding) onOpenNewRoomOnboarding();
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create or Join New Group / Trip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Identity Card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">{room?.name || 'Group Details'}</h2>
            <p className="text-xs text-gray-500 font-medium">Group Details & Member Balances</p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-full border border-emerald-200 dark:border-emerald-900">
            {currentMember?.role === 'admin' ? 'Admin' : 'Member'}
          </span>
        </div>

        {/* Join Code Display */}
        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Group Join Code
            </p>
            <p className="text-2xl font-black tracking-widest text-emerald-600 dark:text-emerald-400 mt-0.5">
              {room?.joinCode}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyJoinCode}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>

            {currentMember?.role === 'admin' && (
              <button
                onClick={handleRegenerateCode}
                disabled={isRegenerating}
                className="p-2 text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl transition"
                title="Regenerate Code"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Recovery Code Banner */}
        {recoveryCode && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center">
                <Key className="w-3.5 h-3.5 mr-1" /> Identity Recovery Key
              </span>
              <button
                onClick={handleCopyRecoveryCode}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center space-x-1"
              >
                {copiedRecovery ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRecovery ? 'Saved' : 'Copy Key'}</span>
              </button>
            </div>
            <p className="text-xs font-mono font-bold tracking-wider text-amber-900 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-900/40 p-2 rounded-xl text-center">
              {recoveryCode}
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Group Members Breakdown List */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center">
            <Users className="w-4 h-4 mr-1 text-emerald-600" /> Group Members & Balances ({members.length})
          </h3>
          <span className="text-xs font-semibold text-emerald-600">{room?.name}</span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {members.map((m) => {
            const mId = m._id || m.id;
            const isMe = mId === (currentMember?._id || currentMember?.id) || m.name === currentMember?.name;
            const memberBalanceData = allMemberBalances ? allMemberBalances[mId] : null;
            const net = memberBalanceData ? memberBalanceData.netBalance : 0;

            return (
              <div key={mId} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-sm border border-emerald-200 dark:border-emerald-800">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm flex items-center">
                      <span>{m.name}</span>
                      {isMe && <span className="ml-1 text-xs text-emerald-600 font-normal">(You)</span>}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {m.role === 'admin' ? 'Room Admin' : 'Member'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span
                      className={`font-black text-sm block ${
                        net > 0.01
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : net < -0.01
                          ? 'text-rose-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {net > 0.01 ? `+₹${net}` : net < -0.01 ? `-₹${Math.abs(net)}` : '₹0 (Settled)'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {net > 0.01 ? 'Owed' : net < -0.01 ? 'Owes' : 'All clear'}
                    </span>
                  </div>

                  {currentMember?.role === 'admin' && !isMe && (
                    <button
                      onClick={() => handleRemoveMember(mId, m.name)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition"
                      title={`Remove ${m.name}`}
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Feature: Recurring Household Bills Scheduler */}
      <RecurringBillsCard />

      {/* Leave Current Group Button */}
      <div className="pt-2">
        <button
          onClick={() => leaveRoom(room.id || room._id)}
          className="w-full py-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition flex items-center justify-center space-x-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Group "{room?.name}"</span>
        </button>
      </div>
    </div>
  );
}
