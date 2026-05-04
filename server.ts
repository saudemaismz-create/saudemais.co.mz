
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

    // Sanitize phone: remove any non-digit characters
    let sanitizedPhone = phone.replace(/\D/g, '');
    
    // In Mozambique, m-pesa/e-mola often expect 258 prefix
    if (sanitizedPhone.length === 9 && (sanitizedPhone.startsWith('84') || sanitizedPhone.startsWith('85') || sanitizedPhone.startsWith('82') || sanitizedPhone.startsWith('86') || sanitizedPhone.startsWith('87'))) {
      sanitizedPhone = '258' + sanitizedPhone;
    }

    console.log(`Initiating ${provider} payment via PaySuite for order ${orderId}: ${amount} MT to ${sanitizedPhone}`);

    try {
      // PaySuite API Integration
      // Using Paytek/PaySuite common API structure for MZ
      const apiToken = process.env.PAYSUITE_API_KEY;
      let rawUrl = (process.env.PAYSUITE_API_URL || 'https://api.paytek.co.mz/v1/c2b/payment').trim();
      
      // Basic URL validation and normalization
      if (!rawUrl.startsWith('http')) {
        rawUrl = 'https://' + rawUrl;
      }
      
      const apiUrl = rawUrl;

      if (!apiToken) {
        console.warn('PAYSUITE_API_KEY not set. Falling back to mock.');
        // Mocking for now if no key is provided
        setTimeout(() => {
          console.log(`USSD Push sent to ${sanitizedPhone}`);
        }, 1000);

        return res.json({
          success: true,
          transactionId: `MOCK_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          message: 'USSD Push enviado com sucesso via PaySuite (Simulado). Por favor, confirme no seu telemóvel.'
        });
      }

      console.log(`Using PaySuite URL: ${apiUrl} for phone: ${sanitizedPhone}`);

      const response = await axios.post(apiUrl, {
        amount: Number(amount),
        msisdn: sanitizedPhone, // Keeping as string to avoid precision/formatting issues
        reference: orderId,
        description: `Pagamento Saude Mais - Pedido ${orderId}`,
        provider: (provider === 'paysuite' || !provider) ? 'mpesa' : provider // Default to mpesa if generic paysuite or nothing selected
      }, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000 // 15s timeout for mobile payment processing
      });

      console.log('PaySuite Response Status:', response.status);
      res.json({
        success: true,
        transactionId: response.data.transactionId || response.data.id || response.data.reference || `REF_${Date.now()}`,
        message: response.data.message || 'USSD Push enviado com sucesso. Por favor, confirme no seu telemóvel.'
      });
    } catch (error: any) {
      // Improved error reporting
      let errorMsg = 'Falha crítica na comunicação com a operadora.';
      
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        errorMsg = error.response.data?.message || error.response.data?.error || `Erro de servidor: ${error.response.status}`;
        console.error('PaySuite Server Error:', error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        errorMsg = 'A operadora não respondeu a tempo. Verifique se o seu número está correto.';
        console.error('PaySuite Network/Timeout:', error.message);
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMsg = error.message === 'Invalid URL' ? 'Configuração de URL de pagamento inválida.' : error.message;
        console.error('PaySuite Request Setup Error:', error.message);
      }

      res.status(500).json({
        success: false,
        error: `Erro PaySuite: ${errorMsg}.`
      });
    }
  });

  // Payment Status Route
  app.get('/api/payment/status', (req, res) => {
    res.json({
      configured: !!process.env.PAYSUITE_API_KEY,
      mode: process.env.PAYSUITE_API_KEY ? 'Produção (PaySuite)' : 'Simulado (Mock)',
      provider: 'PaySuite'
    });
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
