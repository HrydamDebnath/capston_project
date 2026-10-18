import { formatDateTime } from '../../utils/format.js';

export default function MessageBubble({ message, mine }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-mist text-ink'}`}>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
        <p className={`mt-1 text-[11px] ${mine ? 'text-white/70' : 'text-muted'}`}>
          {formatDateTime(message.createdAt, undefined, 'h:mm a')}
          {mine && message.readAt ? ' · Seen' : ''}
        </p>
      </div>
    </div>
  );
}
