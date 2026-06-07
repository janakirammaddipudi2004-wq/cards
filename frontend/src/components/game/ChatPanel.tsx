import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@shared/types/room';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSend }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  return (
    <div className="chat-panel glass-strong" role="log" aria-label="Chat">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>
            No messages yet
          </div>
        )}
        {messages.map((msg) => {
          const initials = msg.senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          return (
            <div key={msg.id} className="chat-message">
              <div className="chat-message-avatar">
                {msg.senderAvatar ? (
                  <img src={msg.senderAvatar} alt="" />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'var(--accent-gold-dark)', color: '#000',
                    fontSize: '0.45rem', fontWeight: 700,
                  }}>
                    {initials}
                  </div>
                )}
              </div>
              <div className="chat-message-content">
                <span className="chat-message-name">{msg.senderName}</span>
                <span className="chat-message-text">{msg.message}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          aria-label="Chat message"
          maxLength={200}
        />
        <button onClick={handleSend} aria-label="Send message">Send</button>
      </div>
    </div>
  );
};
