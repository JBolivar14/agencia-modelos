const nodemailer = require('nodemailer');

function getEmailConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  const secureEnv = process.env.SMTP_SECURE;
  const secure = secureEnv ? String(secureEnv).toLowerCase() === 'true' : (port === 465);

  const ok = !!(host && port && user && pass && from);
  return { ok, host, port, user, pass, from, secure };
}

async function sendEmail({ to, subject, html, text }) {
  const cfg = getEmailConfig();
  if (!cfg.ok) {
    return { ok: false, skipped: true, error: null };
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  });

  const info = await transport.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html
  });

  return { ok: true, skipped: false, info };
}

module.exports = { sendEmail, getEmailConfig };

