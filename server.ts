
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import cors from 'cors';

// In-memory store for 2FA codes (for demo purposes)
// In a real app, use Redis or a database with expiration
const tfaCodes = new Map<string, { code: string, expires: number }>();

async function startServer() {
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

  // 2FA: Send Code
  app.post(['/api/auth/send-2fa', '/api/auth/send-2fa/'], async (req, res) => {
    try {
      const { email: rawEmail } = req.body;
      if (!rawEmail) return res.status(400).json({ error: 'Email é obrigatório' });

      const email = rawEmail.toLowerCase().trim();
      console.log(`[API] POST /api/auth/send-2fa - Email: ${email}`);
      
      // Bypass for test user
      if (email === 'caneabacarhimiacane@gmail.com') {
        console.log('[2FA] Bypass triggered for test user');
        const code = '123456';
        const expires = Date.now() + 60 * 60 * 1000; // 1 hour
        tfaCodes.set(email, { code, expires });
        return res.json({ 
          success: true, 
          simulation: true, 
          code: code,
          message: '[MODO TESTE] Use o código 123456' 
        });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      tfaCodes.set(email, { code, expires });

      console.log(`[2FA] Generated code for ${email}: ${code}`);

      // SMTP Configuration
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = parseInt(process.env.SMTP_PORT || '587');
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || 'no-reply@saudemais.co.mz';
      const resendApiKey = process.env.RESEND_API_KEY;

      // Try Resend first if API key is present
      if (resendApiKey) {
        console.log('[2FA] Resend API Key found. Attempting to send email via Resend...');
        try {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: smtpFrom.includes('<') ? smtpFrom : `Saúde Mais <${smtpFrom}>`,
            to: email,
            subject: 'Seu Código de Verificação Saúde Mais',
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
                <h2 style="color: #0d9488; text-align: center;">Saúde Mais</h2>
                <p style="font-size: 16px; color: #333;">Olá,</p>
                <p style="font-size: 16px; color: #333;">Seu código de verificação de dois fatores é:</p>
                <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0d9488;">${code}</span>
                </div>
                <p style="font-size: 14px; color: #666; text-align: center;">Este código expira em 10 minutos.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999; text-align: center;">Se você não solicitou este código, ignore este email.</p>
              </div>
            `
          });
          console.log(`[2FA] Email sent successfully to ${email} via Resend`);
          return res.json({ success: true, message: 'Código enviado por email (Resend).' });
        } catch (error) {
          console.error('[2FA] Resend error:', error);
          // Fallback to SMTP if Resend fails
        }
      }

      if (smtpHost && smtpUser && smtpPass) {
        console.log('[2FA] SMTP configured. Attempting to send email...');
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass }
          });

          console.log(`[2FA] Sending email to ${email} via ${smtpHost}:${smtpPort}`);
          await transporter.sendMail({
            from: `"Saúde Mais" <${smtpFrom}>`,
            to: email,
            subject: 'Seu Código de Verificação Saúde Mais',
            text: `Seu código de verificação é: ${code}. Ele expira em 10 minutos.`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
                <h2 style="color: #0d9488; text-align: center;">Saúde Mais</h2>
                <p style="font-size: 16px; color: #333;">Olá,</p>
                <p style="font-size: 16px; color: #333;">Seu código de verificação de dois fatores é:</p>
                <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0d9488;">${code}</span>
                </div>
                <p style="font-size: 14px; color: #666; text-align: center;">Este código expira em 10 minutos.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999; text-align: center;">Se você não solicitou este código, ignore este email.</p>
              </div>
            `
          });
          
          console.log(`[2FA] Email sent successfully to ${email} via SMTP`);
          return res.json({ success: true, message: 'Código enviado por email.' });
        } catch (error) {
          console.error('[2FA] SMTP error:', error);
          return res.status(500).json({ error: 'Falha ao enviar email via SMTP. Verifique as configurações.' });
        }
      } else {
        console.warn('[2FA] SMTP not configured. Code logged to console only.');
        return res.json({ 
          success: true, 
          simulation: true, 
          code: code,
          message: '[MODO SIMULAÇÃO] Código enviado (verifique o console do servidor).' 
        });
      }
    } catch (err: any) {
      console.error('[2FA] Global error:', err);
      return res.status(500).json({ error: 'Erro interno ao processar 2FA.' });
    }
  });

  // 2FA: Verify Code
  app.post(['/api/auth/verify-2fa', '/api/auth/verify-2fa/'], (req, res) => {
    const { email: rawEmail, code } = req.body;
    if (!rawEmail || !code) return res.status(400).json({ error: 'Email e código são obrigatórios' });

    const email = rawEmail.toLowerCase().trim();
    console.log(`[API] POST /api/auth/verify-2fa - Email: ${email}, Code: ${code}`);

    const stored = tfaCodes.get(email);
    if (!stored) {
      console.warn(`[2FA] No code found in memory for ${email}`);
      return res.status(400).json({ error: 'Código não encontrado ou expirado. Por favor, solicite um novo código.' });
    }

    if (Date.now() > stored.expires) {
      console.warn(`[2FA] Code expired for ${email}`);
      tfaCodes.delete(email);
      return res.status(400).json({ error: 'Código expirado. Por favor, solicite um novo código.' });
    }

    if (stored.code === code) {
      console.log(`[2FA] Code verified successfully for ${email}`);
      tfaCodes.delete(email);
      return res.json({ success: true });
    } else {
      console.warn(`[2FA] Invalid code attempt for ${email}: expected ${stored.code}, got ${code}`);
      return res.status(400).json({ error: 'Código inválido. Verifique o código enviado ao seu email.' });
    }
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production (Vercel), static files are handled by Vercel's edge
    // but we keep this as a fallback
    const distPath = path.join(process.cwd(), 'dist');
    if (require('fs').existsSync(distPath)) {
      app.use(express.static(distPath));
    }
  }

  // Only listen if not running on Vercel
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

// Export the app for Vercel
export default startServer();
