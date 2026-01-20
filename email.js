const nodemailer = require('nodemailer');

function getEmailConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  const secureEnv = process.env.SMTP_SECURE;
  const secure = secureEnv ? String(secureEnv).toLowerCase() === 'true' : (port === 465);

  const missing = [];
  if (!host) missing.push('SMTP_HOST');
  if (!port || Number.isNaN(port)) missing.push('SMTP_PORT');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');
  if (!from) missing.push('EMAIL_FROM');

  const ok = missing.length === 0;
  return { ok, missing, host, port, user, pass, from, secure };
}

async function sendEmail({ to, subject, html, text }) {
  const cfg = getEmailConfig();
  if (!cfg.ok) {
    return { ok: false, skipped: true, error: 'missing_config', missing: cfg.missing };
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  });

  try {
    const info = await transport.sendMail({
      from: cfg.from,
      to,
      subject,
      text,
      html
    });

    return { ok: true, skipped: false, info: { messageId: info?.messageId, accepted: info?.accepted, rejected: info?.rejected } };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err?.message || String(err),
      code: err?.code || null,
      response: err?.response || null
    };
  }
}

module.exports = { sendEmail, getEmailConfig };

