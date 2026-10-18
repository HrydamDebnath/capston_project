require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const app = require('./src/app');
const registerChatSocket = require('./src/sockets/chatSocket');
const { ensureDefaultTiers } = require('./src/services/entitlementService');
const { runDueNotifications } = require('./src/services/notificationService');
const { releaseExpiredHolds } = require('./src/services/bookingService');

const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',');

async function start() {
  await connectDB(process.env.MONGO_URI);
  await ensureDefaultTiers();

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: allowedOrigins, credentials: true } });
  registerChatSocket(io);
  app.set('io', io);

  const tick = async () => {
    try {
      await releaseExpiredHolds();
      await runDueNotifications();
    } catch (error) {
      console.error('Background job failed:', error.message);
    }
  };
  setInterval(tick, 60 * 1000).unref();

  server.listen(port, () => console.log(`API listening on http://localhost:${port}`));

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
