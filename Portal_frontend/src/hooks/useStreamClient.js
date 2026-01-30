import { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import { StreamVideoClient } from '@stream-io/video-react-sdk';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Singleton instance to prevent multiple connections in Strict Mode
let chatInstance = null;

export const useStreamClient = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState({ chat: null, video: null });

  useEffect(() => {
    if (!user) return;

    const initClients = async () => {
      const apiKey = import.meta.env.VITE_STREAM_API_KEY;

      // 1. Singleton Check: If already connected as this user, reuse it
      if (chatInstance && chatInstance.userID === user.id.toString()) {
        setClients(prev => ({ ...prev, chat: chatInstance }));
        // We still need to init video client as it doesn't persist globally usually
        // But for safety, we regenerate token logic below
      } 

      try {
        const { data } = await api.post('/auth/streamToken');
        
        const userCredentials = {
          id: user.id.toString(),
          name: `${user.first_name} ${user.last_name || ''}`,
          image: user.profile_image_url,
        };

        // 2. Initialize Chat (if not ready)
        if (!chatInstance || chatInstance.userID !== userCredentials.id) {
          chatInstance = StreamChat.getInstance(apiKey);
          await chatInstance.connectUser(userCredentials, data.token);
        }

        // 3. Initialize Video
        const videoInstance = new StreamVideoClient({
          apiKey,
          user: userCredentials,
          token: data.token,
        });

        setClients({ chat: chatInstance, video: videoInstance });
      } catch (err) {
        console.error("Stream initialization failed:", err);
      }
    };

    initClients();

    // Cleanup not strictly necessary for singleton pattern in React 18+ 
    // unless logging out, which handles full page refresh/state clear.
  }, [user]);

  return clients;
};