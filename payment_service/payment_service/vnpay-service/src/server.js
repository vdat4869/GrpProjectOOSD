require('dotenv').config();
const express = require('express');
const cors = require('cors');
const vnpayRoutes = require('./routes/vnpay.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:5004',  // C# Payment Service
    'http://localhost:3000'   // Other frontends
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VNPay Payment Gateway',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// VNPay routes
app.use('/api/vnpay', vnpayRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.url
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     VNPay Payment Gateway Service v2.0         ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏦 VNPay Host: ${process.env.VNP_HOST}`);
  console.log(`🔑 Terminal Code: ${process.env.VNP_TMN_CODE}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  POST http://localhost:${PORT}/api/vnpay/create-payment`);
  console.log(`  GET  http://localhost:${PORT}/api/vnpay/return`);
  console.log(`  GET  http://localhost:${PORT}/api/vnpay/ipn`);
  console.log(`  POST http://localhost:${PORT}/api/vnpay/query`);
  console.log(`  POST http://localhost:${PORT}/api/vnpay/refund`);
  console.log(`  GET  http://localhost:${PORT}/api/vnpay/payment-status/:orderId`);
  console.log('');
  console.log('📚 Documentation:');
  console.log('  VNPay API: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html');
  console.log('  Library: https://github.com/lehuygiang28/vnpay');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});

