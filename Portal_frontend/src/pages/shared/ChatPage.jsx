import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Chat, 
  Channel, 
  Window, 
  ChannelHeader, 
  MessageList, 
  MessageInput, 
  Thread 
} from 'stream-chat-react';
import { Video, Loader2, ArrowLeft, Lock } from 'lucide-react';
import "stream-chat-react/dist/css/v2/index.css";
import { useStreamClient } from '../../hooks/useStreamClient';
import api from '../../api/axios';
import { useAccessibility } from '../../context/AccessibilityContext'; // Import Accessibility Hook

const ChatPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { chat: client } = useStreamClient();
  const { highContrast } = useAccessibility(); // Use High Contrast State
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client || !requestId) return;

    const initChannel = async () => {
      try {
        // 1. Fetch participants (This triggers the Backend Admin fix for permissions)
        const { data } = await api.get(`/auth/chat/participants/${requestId}`);
        const members = data.members;

        if (!members || members.length === 0) {
          console.error("No members found for this chat");
          return;
        }

        // 2. Initialize Channel
        const newChannel = client.channel('messaging', `exam-${requestId}`, {
          name: `Exam Support - Request #${requestId}`,
          members: members, 
        });
        
        await newChannel.watch();
        setChannel(newChannel);
      } catch (err) {
        console.error("Error initializing chat channel:", err);
        // Better error message
        const msg = err.response?.status === 403 
          ? "Access denied. The scribe request might not be fully processed yet." 
          : "Could not connect to chat.";
        alert(msg);
      } finally {
        setLoading(false);
      }
    };

    initChannel();
  }, [client, requestId]);

  // --- Dynamic Styles for High Contrast ---
  const containerClass = highContrast 
    ? "bg-black border-2 border-yellow-400" 
    : "bg-white border border-slate-200 shadow-xl";

  const headerClass = highContrast 
    ? "bg-black border-b border-yellow-400 text-yellow-400" 
    : "bg-white border-b border-slate-100 text-slate-900";

  const buttonClass = highContrast
    ? "p-2 rounded-full border border-yellow-400 text-yellow-400 hover:bg-yellow-900 focus:ring-yellow-500"
    : "p-2 hover:bg-slate-100 rounded-full text-slate-600 focus:ring-slate-400";

  const actionBtnClass = highContrast
    ? "bg-yellow-400 text-black border border-yellow-400 hover:bg-yellow-500 focus:ring-yellow-500"
    : "bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-md";

  if (!client || !channel) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4" role="status">
        <Loader2 className={`animate-spin ${highContrast ? 'text-yellow-400' : 'text-primary'}`} size={40} />
        <p className={`font-medium ${highContrast ? 'text-yellow-400' : 'text-slate-500'}`}>
          {loading ? "Establishing secure connection..." : "Unable to connect to chat."}
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`max-w-6xl mx-auto h-[85vh] rounded-2xl overflow-hidden flex flex-col transition-colors ${containerClass}`}
      role="region"
      aria-label="Chat Interface"
    >
      {/* Custom Header */}
      <div className={`flex items-center justify-between px-6 py-4 z-10 ${headerClass}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className={`transition-colors focus:outline-none focus:ring-2 ${buttonClass}`}
            aria-label="Go back to dashboard"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          
          <div>
            <h1 className="font-bold text-lg leading-tight">Exam Support Chat</h1>
            <div 
              className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${highContrast ? 'text-green-400' : 'text-green-600'}`}
              role="status"
            >
               <Lock size={10} aria-hidden="true" />
               <span>Secure & Encrypted</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => navigate(`/video/${requestId}`)}
          className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${actionBtnClass}`}
          aria-label="Start Video Call"
        >
          <Video size={18} aria-hidden="true" />
          <span>Start Video Call</span>
        </button>
      </div>

      {/* Stream Chat UI */}
      <div className="flex-1 overflow-hidden">
        {/* theme="messaging dark" works better with high contrast/black backgrounds.
            theme="messaging light" is standard.
        */}
        <Chat client={client} theme={highContrast ? "messaging dark" : "messaging light"}>
          <Channel channel={channel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput focus />
            </Window>
            <Thread />
          </Channel>
        </Chat>
      </div>
    </div>
  );
};

export default ChatPage;