'use client';

import { useEffect } from 'react';
import '@n8n/chat/style.css';
// import { createChat } from '@n8n/chat';

const N8nChat = ({ webhookUrl }) => {
  useEffect(() => {
    let chatInstance = null;
    let isMounted = true;

    // webhookUrl is passed as prop now
    if (webhookUrl) {
      // Dynamic import to avoid Turbopack/SSR issues
      import('@n8n/chat').then(({ createChat }) => {
        if (isMounted) {
          chatInstance = createChat({
            webhookUrl,
            initialMessages: [],
            i18n: {
              en: {
                title: 'Hi there! 👋',
                subtitle: "My name is Ayaan\'s AI Assistant. How can I assist you today?",
                footer: '',
                getStarted: 'New Conversation',
                inputPlaceholder: 'Type your question..',
              },
            },
          });
        }
      });
    }

    return () => {
      isMounted = false;
      if (chatInstance) {
        chatInstance.destroy?.();
      }
    };
  }, [webhookUrl]);

  return null; // This component doesn't render anything itself
};

export default N8nChat;
