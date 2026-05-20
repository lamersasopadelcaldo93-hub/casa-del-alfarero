const path = require('path');
const dotenv = require('dotenv');

const envResult = dotenv.config();
if (envResult.error) {
  console.warn('No .env file loaded; using host environment variables if available.');
} else {
  console.log('Loaded .env file.');
}

const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use('/', express.static(path.join(__dirname)));

app.post('/api/send-donation', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Faltan datos requeridos.' });
  }

  const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'RECIPIENT_EMAIL', 'FROM_EMAIL'];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  if (missingEnv.length > 0) {
    console.error('Missing required environment variables:', missingEnv);
    return res.status(500).json({
      success: false,
      error: `Faltan variables de configuración: ${missingEnv.join(', ')}`
    });
  }

  try {
    console.log('SMTP config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure_env: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER ? '[redacted]' : undefined
    });

    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const secureFlag = smtpPort === 465;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: secureFlag,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: process.env.RECIPIENT_EMAIL,
      subject: `Formulario de donaciones: ${name}`,
      text: `Nuevo mensaje desde formulario de donaciones:\n\nNombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`
    };

    await transporter.sendMail(mailOptions);

    return res.json({ success: true });
  } catch (err) {
    console.error('Error sending email:', err);
    const errMsg = process.env.NODE_ENV === 'production' ? 'Error al enviar el correo.' : err.message;
    return res.status(500).json({ success: false, error: errMsg });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
