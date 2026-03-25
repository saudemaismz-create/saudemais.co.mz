
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

    console.log(`Initiating ${provider} payment via PaySuite for order ${orderId}: ${amount} MT to ${phone}`);

    try {
      // PaySuite API Integration
      // Using Paytek/PaySuite common API structure for MZ
      const apiToken = process.env.PAYSUITE_API_KEY;
      const apiUrl = process.env.PAYSUITE_API_URL || 'https://api.paytek.co.mz/v1/c2b/payment';

      if (!apiToken) {
        console.warn('PAYSUITE_API_KEY not set. Falling back to mock.');
        // Mocking for now if no key is provided
        setTimeout(() => {
          console.log(`USSD Push sent to ${phone}`);
        }, 1000);

        return res.json({
          success: true,
          transactionId: `MOCK_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          message: 'USSD Push enviado com sucesso via PaySuite (Simulado). Por favor, confirme no seu telemóvel.'
        });
      }

      const response = await axios.post(apiUrl, {
        amount: amount,
        msisdn: phone,
        reference: orderId,
        description: `Pagamento Saude Mais - Pedido ${orderId}`,
        provider: provider === 'paysuite' ? 'mpesa' : provider // Default to mpesa if generic paysuite selected
      }, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('PaySuite Response:', response.data);
      res.json({
        success: true,
        transactionId: response.data.transactionId || response.data.id,
        message: 'USSD Push enviado com sucesso. Por favor, confirme no seu telemóvel.'
      });
    } catch (error: any) {
      console.error('PaySuite Error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.message || 'Falha ao iniciar o pagamento via PaySuite. Verifique o número e tente novamente.'
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
