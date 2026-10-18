const Client = require('../models/Client');
const Therapist = require('../models/Therapist');
const Message = require('../models/Message');
const { verifyToken } = require('../utils/token');

function roomName(therapistId, clientId) {
  return `chat:${therapistId}:${clientId}`;
}

async function identify(token) {
  const payload = verifyToken(token);
  if (payload.role === 'therapist') {
    const therapist = await Therapist.findById(payload.id).select('_id');
    if (!therapist) throw new Error('Unknown therapist');
    return { role: 'therapist', therapistId: String(therapist._id) };
  }
  const client = await Client.findById(payload.id).select('_id therapist status');
  if (!client || client.status === 'archived') throw new Error('Unknown client');
  return { role: 'client', therapistId: String(client.therapist), clientId: String(client._id) };
}

async function resolveClientId(identity, requested) {
  if (identity.role === 'client') return identity.clientId;
  if (!requested) return null;
  const owned = await Client.exists({ _id: requested, therapist: identity.therapistId });
  return owned ? String(requested) : null;
}

module.exports = function registerChatSocket(io) {
  io.use(async (socket, next) => {
    try {
      socket.data.identity = await identify(socket.handshake.auth && socket.handshake.auth.token);
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const identity = socket.data.identity;
    socket.join(`therapist:${identity.therapistId}`);
    if (identity.role === 'client') socket.join(roomName(identity.therapistId, identity.clientId));

    socket.on('chat:join', async ({ clientId } = {}, ack) => {
      const resolved = await resolveClientId(identity, clientId);
      if (!resolved) return ack && ack({ ok: false });
      socket.join(roomName(identity.therapistId, resolved));
      return ack && ack({ ok: true });
    });

    socket.on('chat:send', async ({ clientId, body } = {}, ack) => {
      const text = typeof body === 'string' ? body.trim() : '';
      const resolved = await resolveClientId(identity, clientId);
      if (!text || text.length > 2000 || !resolved) return ack && ack({ ok: false });

      const message = await Message.create({
        therapist: identity.therapistId,
        client: resolved,
        senderRole: identity.role,
        body: text,
      });
      const room = roomName(identity.therapistId, resolved);
      io.to(room).emit('chat:message', message);
      if (identity.role === 'client') {
        io.to(`therapist:${identity.therapistId}`).emit('chat:notify', { clientId: resolved, messageId: message._id });
      }
      return ack && ack({ ok: true, message });
    });

    socket.on('chat:typing', async ({ clientId, typing } = {}) => {
      const resolved = await resolveClientId(identity, clientId);
      if (!resolved) return;
      socket.to(roomName(identity.therapistId, resolved)).emit('chat:typing', { from: identity.role, typing: Boolean(typing) });
    });

    socket.on('chat:read', async ({ clientId } = {}) => {
      const resolved = await resolveClientId(identity, clientId);
      if (!resolved) return;
      const otherRole = identity.role === 'therapist' ? 'client' : 'therapist';
      const readAt = new Date();
      await Message.updateMany(
        { therapist: identity.therapistId, client: resolved, senderRole: otherRole, readAt: { $exists: false } },
        { readAt }
      );
      io.to(roomName(identity.therapistId, resolved)).emit('chat:read', { by: identity.role, readAt });
    });
  });
};
