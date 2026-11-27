const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('node:path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const BACKEND_ROOT = __dirname;
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

app.get('/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'unavailable',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
});
app.get('/api/config', (req, res) => {
  res.set('Cache-Control', 'no-store').json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || ''
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

app.use(express.static(path.join(WORKSPACE_ROOT, 'Frontend')));
app.get('/', (req, res) => res.sendFile(path.join(WORKSPACE_ROOT, 'Frontend', 'index.html')));
app.use('/images', express.static(path.join(WORKSPACE_ROOT, 'images')));
app.get('/admin', (req, res) => res.redirect(302, '/admin/'));
app.get(['/admin/', '/admin/admin.html'], (req, res) => res.sendFile(path.join(BACKEND_ROOT, 'admin.html')));

app.get('/admin/admin.css', (req, res) => res.sendFile(path.join(BACKEND_ROOT, 'admin.css')));
app.get('/admin/admin.js', (req, res) => res.sendFile(path.join(BACKEND_ROOT, 'admin.js')));

app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use((req, res) => res.status(404).send('Page not found.'));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error('Request failed:', error.message);
  return res.status(status).json({
    message: status >= 500 ? 'The server could not complete the request.' : error.message
  });
});

async function startServer() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured.');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be configured.');
  await require('./config/db')();
    // Force-Create or Reset Admin Account
  const User = require('./model/user.model');
  const bcrypt = require('bcryptjs');
  const adminEmail = 'ujjawalsinghrajput@gmail.com';
  const adminPass = 'ujjawal001';
  const hashedPassword = await bcrypt.hash(adminPass, 12);
  await User.findOneAndUpdate(
    { email: adminEmail },
    {
      name: 'Gayatri Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      verified: true,
      authProvider: 'password'
    },
    { upsert: true, new: true }
  );
  console.log('✅ Admin Account Ready:', adminEmail, '| Password:', adminPass);


  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }
  const host = process.env.HOST || '0.0.0.0';
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host);
    server.once('listening', () => {
      console.log(`Gayatri Traders server listening on ${host}:${port}`);
      resolve(server);
    });
    server.once('error', reject);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Could not start the server:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
