import React, { useEffect, useState, useRef } from 'react'; // Added useRef
import { useParams, useNavigate } from 'react-router-dom';
import { 
  StreamVideo, 
  StreamCall, 
  useCallStateHooks, 
  ParticipantView,
  CallControls,
  StreamTheme
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { useStreamClient } from '../../hooks/useStreamClient';
import api from '../../api/axios';
import { Loader2 } from 'lucide-react';

const SimpleTwoScreenLayout = () => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  
  const local = participants.find(p => p.isLocalParticipant);
  const remote = participants.find(p => !p.isLocalParticipant);

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-black gap-1 p-1">
      <div className="flex-1 bg-zinc-900 rounded-xl overflow-hidden relative flex items-center justify-center border border-zinc-800">
        {remote ? (
          <ParticipantView participant={remote} />
        ) : (
          <div className="text-center">
            <Loader2 className="animate-spin text-zinc-500 mx-auto mb-4" size={48} />
            <p className="text-zinc-400 font-bold text-xl">Calling partner...</p>
            <p className="text-zinc-600 text-sm mt-2">Notification sent.</p>
          </div>
        )}
        {remote && (
          <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-md text-sm font-bold backdrop-blur">
            {remote.name}
          </div>
        )}
      </div>

      <div className="h-1/4 md:h-full md:w-1/3 bg-zinc-900 rounded-xl overflow-hidden relative border border-zinc-800">
         {local && <ParticipantView participant={local} />}
         <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-md text-sm font-bold backdrop-blur">
          You
        </div>
      </div>
    </div>
  );
};

const VideoCall = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { video: videoClient, chat: chatClient } = useStreamClient();
  const [call, setCall] = useState(null);
  const [inviteSent, setInviteSent] = useState(false);
  
  // Use a ref to track the call for cleanup, because 'call' state 
  // might be stale in the useEffect cleanup function
  const callRef = useRef(null);

  useEffect(() => {
    if (!videoClient || !requestId) return;

    const initCall = async () => {
      try {
        const callInstance = videoClient.call('default', `exam-${requestId}`);
        await callInstance.join({ create: true });
        setCall(callInstance);
        callRef.current = callInstance; // Store in ref for cleanup
      } catch (err) {
        console.error("Video join error:", err);
        alert("Failed to join video room");
        navigate(-1);
      }
    };

    initCall();

    return () => {
      // Safety cleanup on unmount using the ref
      if (callRef.current) {
        // We don't await here because unmount is synchronous-ish
        callRef.current.leave().catch(console.error);
        callRef.current = null;
      }
    };
  }, [videoClient, requestId, navigate]);

  useEffect(() => {
    if (!chatClient || !requestId || inviteSent) return;

    const sendInvite = async () => {
      try {
        await api.get(`/auth/chat/participants/${requestId}`);
        const channel = chatClient.channel('messaging', `exam-${requestId}`);
        await channel.watch(); 
        
        await channel.sendMessage({
          text: 'VIDEO_CALL_STARTED', 
        });

        console.log("Invite notification sent!");
        setInviteSent(true);
      } catch (err) {
        console.error("Failed to send invite notification:", err);
      }
    };

    sendInvite();
  }, [chatClient, requestId, inviteSent]);

  if (!call) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-zinc-50 gap-4">
      <Loader2 className="animate-spin text-primary" size={48} />
      <p className="font-bold text-zinc-600 text-lg">Connecting Secure Line...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <StreamVideo client={videoClient}>
        <StreamTheme>
          <StreamCall call={call}>
            <div className="h-[calc(100vh-100px)] w-full">
               <SimpleTwoScreenLayout />
            </div>
            <div className="h-[100px] bg-zinc-950 flex items-center justify-center border-t border-zinc-800">
               <CallControls 
                 onLeave={async () => {
                   try {
                     // Try to leave cleanly
                     await call.leave();
                     callRef.current = null; // Clear ref so cleanup doesn't run twice
                   } catch (err) {
                     console.error("Error leaving call:", err);
                   } finally {
                     // ALWAYS Navigate, even if leave fails
                     navigate(`/chat/${requestId}`);
                   }
                 }} 
               />
            </div>
          </StreamCall>
        </StreamTheme>
      </StreamVideo>
    </div>
  );
};

export default VideoCall;

// import React, { useEffect, useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { 
//   StreamVideo, 
//   StreamCall, 
//   useCallStateHooks, 
//   ParticipantView,
//   CallControls,
//   StreamTheme
// } from '@stream-io/video-react-sdk';
// import '@stream-io/video-react-sdk/dist/css/styles.css';
// import { useStreamClient } from '../../hooks/useStreamClient';
// import api from '../../api/axios';
// import { Loader2 } from 'lucide-react';

// const SimpleTwoScreenLayout = () => {
//   const { useParticipants } = useCallStateHooks();
//   const participants = useParticipants();
  
//   const local = participants.find(p => p.isLocalParticipant);
//   const remote = participants.find(p => !p.isLocalParticipant);

//   return (
//     <div className="flex flex-col md:flex-row h-full w-full bg-black gap-1 p-1">
//       <div className="flex-1 bg-zinc-900 rounded-xl overflow-hidden relative flex items-center justify-center border border-zinc-800">
//         {remote ? (
//           <ParticipantView participant={remote} />
//         ) : (
//           <div className="text-center">
//             <Loader2 className="animate-spin text-zinc-500 mx-auto mb-4" size={48} />
//             <p className="text-zinc-400 font-bold text-xl">Calling partner...</p>
//             <p className="text-zinc-600 text-sm mt-2">Notification sent.</p>
//           </div>
//         )}
//         {remote && (
//           <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-md text-sm font-bold backdrop-blur">
//             {remote.name}
//           </div>
//         )}
//       </div>

//       <div className="h-1/4 md:h-full md:w-1/3 bg-zinc-900 rounded-xl overflow-hidden relative border border-zinc-800">
//          {local && <ParticipantView participant={local} />}
//          <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-md text-sm font-bold backdrop-blur">
//           You
//         </div>
//       </div>
//     </div>
//   );
// };

// const VideoCall = () => {
//   const { requestId } = useParams();
//   const navigate = useNavigate();
//   const { video: videoClient, chat: chatClient } = useStreamClient();
//   const [call, setCall] = useState(null);
//   const [inviteSent, setInviteSent] = useState(false);

//   useEffect(() => {
//     if (!videoClient || !requestId) return;

//     const initCall = async () => {
//       try {
//         const callInstance = videoClient.call('default', `exam-${requestId}`);
//         await callInstance.join({ create: true });
//         setCall(callInstance);
//       } catch (err) {
//         console.error("Video join error:", err);
//         alert("Failed to join video room");
//         navigate(-1);
//       }
//     };

//     initCall();

//     return () => {
//       // Safety cleanup on unmount
//       if (call) call.leave();

//     };
//   }, [videoClient, requestId, navigate]);

//   useEffect(() => {
//     if (!chatClient || !requestId || inviteSent) return;

//     const sendInvite = async () => {
//       try {
//         await api.get(`/auth/chat/participants/${requestId}`);
//         const channel = chatClient.channel('messaging', `exam-${requestId}`);
//         await channel.watch(); 
        
//         await channel.sendMessage({
//           text: 'VIDEO_CALL_STARTED', 
//         });

//         console.log("Invite notification sent!");
//         setInviteSent(true);
//       } catch (err) {
//         console.error("Failed to send invite notification:", err);
//       }
//     };

//     sendInvite();
//   }, [chatClient, requestId, inviteSent]);

//   if (!call) return (
//     <div className="flex flex-col items-center justify-center min-h-[80vh] bg-zinc-50 gap-4">
//       <Loader2 className="animate-spin text-primary" size={48} />
//       <p className="font-bold text-zinc-600 text-lg">Connecting Secure Line...</p>
//     </div>
//   );

//   return (
//     <div className="fixed inset-0 z-[100] bg-black">
//       <StreamVideo client={videoClient}>
//         <StreamTheme>
//           <StreamCall call={call}>
//             <div className="h-[calc(100vh-100px)] w-full">
//                <SimpleTwoScreenLayout />
//             </div>
//             <div className="h-[100px] bg-zinc-950 flex items-center justify-center border-t border-zinc-800">
//                <CallControls 
//                  onLeave={async () => {
//                    await call.leave();

//                    //navigate(-1);
//                    navigate(`/chat/${requestId}`);
//                  }} 
//                />
//             </div>
//           </StreamCall>
//         </StreamTheme>
//       </StreamVideo>
//     </div>
//   );
// };

// export default VideoCall;