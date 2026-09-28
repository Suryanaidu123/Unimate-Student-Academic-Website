require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const connectDB = require('./config/db');
const routes = require('./routes');
const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));
app.use(globalLimiter);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'UniMate API', env: env.NODE_ENV }));
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

(async () => {
  await connectDB();
  app.listen(env.PORT, () => console.log(`🚀 UniMate API on :${env.PORT}`));
})();