
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

    console.log(`Initiating ${provider} payment for order ${orderId}: ${amount} MT to ${sanitizedPhone}`);

    try {
      if (provider === 'mpesa') {
        const mpesaKey = process.env.MPESA_API_KEY;
        const mpesaUrl = process.env.MPESA_API_URL;

        if (!mpesaKey || !mpesaUrl) {
          console.warn('MPESA_API_KEY or MPESA_API_URL not set. Falling back to mock.');
          return res.json({
            success: true,
            transactionId: `MPESA_MOCK_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            message: 'M-Pesa: USSD Push enviado com sucesso (Simulado).'
          });
        }

        // Dedicated M-Pesa API structure
        const response = await axios.post(mpesaUrl, {
          amount: Number(amount),
          msisdn: sanitizedPhone,
          reference: orderId,
          description: `Pagamento Saude Mais - M-Pesa`,
          transactionReference: orderId
        }, {
          headers: {
            'Authorization': `Bearer ${mpesaKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        return res.json({
          success: true,
          transactionId: response.data.transactionId || response.data.id,
          message: 'M-Pesa: USSD Push enviado. Por favor, confirme no seu telemóvel.'
        });

      } else if (provider === 'emola') {
        const emolaKey = process.env.EMOLA_API_KEY;
        const emolaUrl = process.env.EMOLA_API_URL;

        if (!emolaKey || !emolaUrl) {
          console.warn('EMOLA_API_KEY or EMOLA_API_URL not set. Falling back to mock.');
          return res.json({
            success: true,
            transactionId: `EMOLA_MOCK_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            message: 'e-Mola: USSD Push enviado com sucesso (Simulado).'
          });
        }

        // Dedicated e-Mola API structure
        const response = await axios.post(emolaUrl, {
          amount: Number(amount),
          msisdn: sanitizedPhone,
          referenceId: orderId,
          description: `Pagamento Saude Mais - e-Mola`
        }, {
          headers: {
            'Authorization': `Bearer ${emolaKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        return res.json({
          success: true,
          transactionId: response.data.transactionId || response.data.id,
          message: 'e-Mola: USSD Push enviado. Por favor, confirme no seu telemóvel.'
        });
      }

      throw new Error('Provedor de pagamento não suportado.');
    } catch (error: any) {
      let errorMsg = 'Falha na comunicação com o sistema de pagamento.';
      if (error.response) {
        errorMsg = error.response.data?.message || error.response.data?.error || `Erro de servidor: ${error.response.status}`;
      } else if (error.request) {
        errorMsg = 'Tempo de espera excedido. Verifique sua conexão.';
      } else {
        errorMsg = error.message;
      }

      res.status(500).json({
        success: false,
        error: `Erro de Pagamento: ${errorMsg}`
      });
    }
  });

  // Payment Status Route
  app.get('/api/payment/status', (req, res) => {
    res.json({
      mpesa: !!process.env.MPESA_API_KEY,
      emola: !!process.env.EMOLA_API_KEY,
      mode: (process.env.MPESA_API_KEY || process.env.EMOLA_API_KEY) ? 'Produção' : 'Simulado'
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
