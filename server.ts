
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Payment API Route
  app.post('/api/payment/initiate', async (req, res) => {
    const { amount, phone, provider, orderId } = req.body;

    console.log(`Initiating ${provider} payment for order ${orderId}: ${amount} MT to ${phone}`);

    // REAL INTEGRATION POINT:
    // This is where you would call the Paytek, RevPay, or M-Pesa API.
    // Example (Mocking for now, but structured for real API):
    
    try {
      /* 
      // REAL CODE EXAMPLE (e.g., Paytek):
      const response = await axios.post('https://api.paytek.co.mz/v1/c2b/payment', {
        amount: amount,
        msisdn: phone,
        reference: orderId,
        description: 'Pagamento Saude Mais'
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.PAYMENT_GATEWAY_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      return res.json(response.data);
      */

      // Mocking a successful USSD push trigger
      setTimeout(() => {
        console.log(`USSD Push sent to ${phone}`);
      }, 1000);

      res.json({
        success: true,
        transactionId: `TXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        message: 'USSD Push enviado com sucesso. Por favor, confirme no seu telemóvel.'
      });
    } catch (error: any) {
      console.error('Payment Error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: 'Falha ao iniciar o pagamento. Verifique o número e tente novamente.'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
