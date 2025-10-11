'use client';

import { useEffect } from 'react';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';

const N8nChat = () => {
  useEffect(() => {
    const chat = createChat({
      webhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL,
      initialMessages: [
    
      ],
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

    // To clean up the chat when the component unmounts
    return () => {
      chat.destroy();
    };
  }, []);

  return null; // This component doesn't render anything itself
};

export default N8nChat;
