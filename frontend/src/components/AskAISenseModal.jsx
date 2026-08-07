import { useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { X, Sparkles, Send, Bot, User } from 'lucide-react';

export default function AskAISenseModal({ isOpen, onClose }) {
  const { askAISense } = useRoomStore();

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "👋 Hi! I'm Ask SplitSense. Ask me anything about your flat's balances, who owes whom, or monthly category spending!",
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || isAsking) return;

    const userMsg = { role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsAsking(true);

    const res = await askAISense(q);
    setIsAsking(false);

    if (res.success) {
      setMessages((prev) => [...prev, { role: 'assistant', text: res.answer }]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I could not query your room data right now.' },
      ]);
    }
  };

  const sampleQuestions = [
    'Who owes me money?',
    'How much do I owe in total?',
    'What was our biggest expense this month?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col h-[520px] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Ask SplitSense</h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Verified Database Financial Assistant
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  m.role === 'user' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-emerald-600 text-white'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white font-medium rounded-tr-none'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="flex items-center space-x-2 text-xs text-gray-400 font-medium italic">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Querying household records...</span>
            </div>
          )}
        </div>

        {/* Sample Questions Pills */}
        <div className="px-6 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center space-x-2 overflow-x-auto scrollbar-none">
          {sampleQuestions.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuestion(sq);
              }}
              className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] font-semibold hover:bg-emerald-100 whitespace-nowrap"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-100 dark:border-gray-800 flex space-x-2">
          <input
            type="text"
            placeholder="Ask a question about room expenses..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-xs border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={isAsking || !question.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
