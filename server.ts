
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Payment Status check
  app.get("/api/payment/status", (req, res) => {
    const hasToken = !!process.env.PAYMENT_GATEWAY_TOKEN;
    res.json({ 
      configured: hasToken,
      gateway: "Paytek",
      mode: hasToken ? "Produção" : "Simulação"
    });
  });

  // Payment API Route
  app.post('/api/payment/initiate', async (req, res) => {
    const { amount, phone, provider, orderId } = req.body;
    const apiKey = process.env.PAYMENT_GATEWAY_TOKEN;

    console.log(`Initiating ${provider} payment for order ${orderId}: ${amount} MT to ${phone}`);

    // If no API key is set, we fall back to simulation mode so the app doesn't break for the user
    if (!apiKey) {
      console.warn('PAYMENT_GATEWAY_TOKEN not found. Running in SIMULATION mode.');
      setTimeout(() => {
        console.log(`SIMULATION: USSD Push sent to ${phone}`);
      }, 1000);

      return res.json({
        success: true,
        simulation: true,
        transactionId: `SIM_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        message: '[MODO SIMULAÇÃO] USSD Push enviado. Por favor, confirme no seu telemóvel.'
      });
    }
    
    try {
      // REAL PAYTEK INTEGRATION
      // Note: The endpoint and payload structure should match Paytek's official documentation
      const response = await axios.post('https://api.paytek.co.mz/v1/c2b/payment', {
        amount: amount,
        msisdn: phone.replace(/\s/g, ''), // Remove spaces from phone number
        reference: orderId,
        description: `Saude Mais - Pedido ${orderId}`,
        provider: provider.toUpperCase() // MPESA or EMOLA
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Paytek Response:', response.data);

      res.json({
        success: true,
        data: response.data,
        message: 'Pedido de pagamento enviado com sucesso.'
      });
    } catch (error: any) {
      const errorData = error.response?.data;
      console.error('Paytek Payment Error:', errorData || error.message);
      
      res.status(500).json({
        success: false,
        error: errorData?.message || 'Falha ao comunicar com o gateway de pagamento. Verifique o número e tente novamente.'
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
