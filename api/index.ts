
import express from 'express';
import path from 'path';
import axios from 'axios';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// Request logger
app.use((req, res, next) => {
  console.log(`[SERVER] ${req.method} ${req.url}`);
  next();
});

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

  console.log(`[API] POST /api/payment/initiate - Order: ${orderId}`);

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
    const response = await axios.post('https://api.paytek.co.mz/v1/c2b/payment', {
      amount: amount,
      msisdn: phone.replace(/\s/g, ''), 
      reference: orderId,
      description: `Saude Mais - Pedido ${orderId}`,
      provider: provider.toUpperCase() 
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

// Catch-all for /api that returns JSON instead of falling through to Vite/Static
app.all('/api/*', (req, res) => {
  console.warn(`[SERVER] 404 on API route: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: `API route not found: ${req.method} ${req.url}`,
    suggestion: "Check if the route is correctly defined in server.ts"
  });
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  // Dynamic import to avoid crash on Vercel
  import('vite').then(({ createServer: createViteServer }) => {
    createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    }).then(vite => {
      app.use(vite.middlewares);
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    });
  });
} else if (process.env.VERCEL !== '1') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('(.*)', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
