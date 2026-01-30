import React, { useEffect } from 'react';
import { useStreamClient } from '../hooks/useStreamClient';
import { useToast } from '../context/ToastContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GlobalCallListener = () => {
  const { chat: client } = useStreamClient();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!client || !user) return;

    const handleNewMessage = (event) => {
      // 1. Check if message is a system call notification
      if (event.message.text === 'VIDEO_CALL_STARTED' && event.message.type === 'system') {
        
        // 2. Ignore if I sent it
        if (event.user.id === user.id.toString()) return;

        // 3. Ignore if I am already on the video page
        if (location.pathname.includes('/video/')) return;

        // 4. Extract Request ID from channel ID (format: exam-{requestId})
        const channelId = event.channel_id;
        const requestId = channelId.replace('exam-', '');

        // 5. Show Accessible Toast
        addToast(
          `${event.user.name} started a video call.`,
          'call',
          {
            label: 'Join Call',
            onClick: () => navigate(`/video/${requestId}`)
          }
        );
      }
    };

    // Listen to events on all channels the user is part of
    client.on('message.new', handleNewMessage);

    return () => {
      client.off('message.new', handleNewMessage);
    };
  }, [client, user, location.pathname, addToast, navigate]);

  return null; // Invisible component
};

export default GlobalCallListener;