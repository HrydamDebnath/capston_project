import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../../api/axiosInstance.js';
import MessageBubble from './MessageBubble.jsx';
import Loader from '../common/Loader.jsx';
import { apiOrigin } from '../../utils/format.js';

export default function ChatWindow({ role, token, clientId, historyUrl, counterpartName }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const markRead = useCallback(() => {
    if (socketRef.current) socketRef.current.emit('chat:read', { clientId });
  }, [clientId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get(historyUrl, { actor: role === 'client' ? 'client' : 'therapist' })
      .then(({ data }) => active && setMessages(data.messages))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [historyUrl, role]);

  useEffect(() => {
    const socket = io(apiOrigin(), { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('chat:join', { clientId }, () => markRead());
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:message', (message) => {
      if (clientId && String(message.client) !== String(clientId)) return;
      setMessages((items) => (items.some((item) => item._id === message._id) ? items : [...items, message]));
      if (message.senderRole !== role) markRead();
    });
    socket.on('chat:typing', (event) => {
      if (event.from !== role) setTyping(event.typing);
    });
    socket.on('chat:read', (event) => {
      if (event.by !== role) {
        setMessages((items) => items.map((item) => (item.senderRole === role && !item.readAt ? { ...item, readAt: event.readAt } : item)));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, clientId, role, markRead]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  const onChange = (event) => {
    setDraft(event.target.value);
    if (!socketRef.current) return;
    socketRef.current.emit('chat:typing', { clientId, typing: true });
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => socketRef.current && socketRef.current.emit('chat:typing', { clientId, typing: false }), 1500);
  };

  const send = (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !socketRef.current) return;
    socketRef.current.emit('chat:send', { clientId, body }, () => {});
    socketRef.current.emit('chat:typing', { clientId, typing: false });
    setDraft('');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) send(event);
  };

  return (
    <div className="flex h-[32rem] flex-col rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="font-bold">{counterpartName}</p>
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${connected ? 'text-calm' : 'text-muted'}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-calm' : 'bg-muted/50'}`} />
          {connected ? 'Live' : 'Connecting'}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <Loader label="Loading messages" />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No messages yet. Say hello to start the conversation.</p>
        ) : (
          messages.map((message) => <MessageBubble key={message._id} message={message} mine={message.senderRole === role} />)
        )}
        {typing && <p className="text-xs italic text-muted">{counterpartName} is typing…</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={draft}
          onChange={onChange}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={2000}
          placeholder="Write a message"
          aria-label="Message"
          className="input !min-h-0 max-h-32 flex-1 resize-none"
        />
        <button type="submit" disabled={!draft.trim()} className="btn btn-primary">Send</button>
      </form>
    </div>
  );
}
