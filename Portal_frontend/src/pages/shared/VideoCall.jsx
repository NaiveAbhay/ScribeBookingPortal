import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  StreamVideo, 
  StreamCall, 
  useCallStateHooks, 
  ParticipantView,
  CallControls 
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { useStreamClient } from '../../hooks/useStreamClient';
import { Loader2, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from 'lucide-react';

// --- SIMPLIFIED LAYOUT COMPONENT ---
const SimpleTwoScreenLayout = () => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  
  // Get Local and Remote participants
  const localParticipant = participants.find(p => p.isLocalParticipant);
  const remoteParticipant = participants.find(p => !p.isLocalParticipant);

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-black p-2 gap-2">
      {/* 1. Remote Participant (The other person) - Takes Priority */}
      <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800">
        {remoteParticipant ? (
          <ParticipantView participant={remoteParticipant} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-bold text-xl">Waiting for other person...</p>
            <p className="text-sm">They have been notified.</p>
          </div>
        )}
        {/* Name Tag */}
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm font-bold backdrop-blur-md">
          {remoteParticipant ? (remoteParticipant.name || 'Scribe/Student') : 'Connecting...'}
        </div>
      </div>

      {/* 2. Local Participant (Me) */}
      <div className="h-1/3 md:h-full md:w-1/3 bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800">
         {localParticipant && <ParticipantView participant={localParticipant} />}
         <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm font-bold backdrop-blur-md">
          You
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
const VideoCall = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { video: videoClient, chat: chatClient } = useStreamClient(); // Need Chat client too for notification
  const [call, setCall] = useState(null);

  useEffect(() => {
    if (!videoClient || !requestId) return;

    const initCall = async () => {
      try {
        const callInstance = videoClient.call('default', `exam-${requestId}`);
        await callInstance.join({ create: true });
        setCall(callInstance);

        // --- NOTIFICATION TRIGGER ---
        // Send a message to the chat channel so the other person gets a Toast
        if (chatClient) {
          const channel = chatClient.channel('messaging', `exam-${requestId}`);
          // Send "System" message
          await channel.sendMessage({
            text: 'VIDEO_CALL_STARTED',
            type: 'system', // Special flag we look for in GlobalListener
          });
        }

      } catch (err) {
        console.error("Failed to join call:", err);
        alert("Could not start video call. Please try again.");
        navigate(-1);
      }
    };

    initCall();

    return () => {
      if (call) call.leave();
    };
  }, [videoClient, chatClient, requestId, navigate]);

  if (!call) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 gap-4">
      <Loader2 className="animate-spin text-primary" size={48} />
      <p className="font-bold text-slate-600 text-lg">Setting up secure line...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <StreamVideo client={videoClient}>
        <StreamCall call={call}>
          
          {/* 1. The Layout */}
          <div className="h-[calc(100vh-100px)]">
             <SimpleTwoScreenLayout />
          </div>

          {/* 2. Simple High-Contrast Controls */}
          <div className="h-[100px] bg-slate-900 flex items-center justify-center gap-6 border-t border-slate-800">
             {/* Uses Built-in CallControls for logic, but wrapped or custom is better. 
                 Let's use the built-in one but styled simplistically. 
             */}
             <div className="scale-125">
                <CallControls onLeave={() => navigate(-1)} />
             </div>
          </div>

        </StreamCall>
      </StreamVideo>
    </div>
  );
};

export default VideoCall;