
import express from 'express';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import cors from 'cors';
import serverless from 'serverless-http';

const app = express();
app.use(cors());
app.use(express.json());

const tfaCodes = new Map<string, { code: string, expires: number }>();

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post('/api/auth/send-2fa', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000;
  tfaCodes.set(email, { code, expires });

  const smtpFrom = process.env.SMTP_FROM || 'no-reply@saudemais.co.mz';
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: smtpFrom.includes('<') ? smtpFrom : `Saúde Mais <${smtpFrom}>`,
        to: email,
        subject: 'Seu Código de Verificação Saúde Mais',
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
                <h2 style="color: #0d9488; text-align: center;">Saúde Mais</h2>
                <p style="font-size: 16px; color: #333;">Seu código de verificação é: <strong>${code}</strong></p>
              </div>`
      });
      return res.json({ success: true, message: 'Código enviado (Resend).' });
    } catch (error) {
      console.error('Resend error:', error);
    }
  }
  
  // Fallback simulation if no keys
  return res.json({ success: true, simulation: true, code, message: '[SIMULAÇÃO] Código enviado.' });
});

app.post('/api/auth/verify-2fa', (req, res) => {
  const { email, code } = req.body;
  const stored = tfaCodes.get(email);
  if (!stored || Date.now() > stored.expires) return res.status(400).json({ error: 'Código expirado' });
  if (stored.code === code) {
    tfaCodes.delete(email);
    return res.json({ success: true });
  }
  return res.status(400).json({ error: 'Código inválido' });
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

app.post('/api/payment/initiate', async (req, res) => {
  const { amount, phone, provider, orderId } = req.body;
  const apiKey = process.env.PAYMENT_GATEWAY_TOKEN;

  if (!apiKey) {
    return res.json({ success: true, simulation: true, transactionId: 'SIM_' + Date.now(), message: '[SIMULAÇÃO] Pagamento iniciado.' });
  }

  try {
    const response = await axios.post('https://api.paytek.co.mz/v1/c2b/payment', {
      amount, msisdn: phone.replace(/\s/g, ''), reference: orderId, provider: provider.toUpperCase()
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    res.json({ success: true, data: response.data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Erro no gateway de pagamento.' });
  }
});

export const handler = serverless(app);
export default app;
