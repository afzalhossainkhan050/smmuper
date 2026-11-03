'use strict';
/**
 * Minimal dependency-free SMTP mailer.
 * Supports implicit TLS (port 465 / "SSL"), STARTTLS (port 587 / "TLS") and plain SMTP,
 * with AUTH PLAIN / AUTH LOGIN. Settings come from Admin → Email Settings.
 */
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const db = require('../db/database');

const DEFAULTS = {
  mail_driver: 'smtp',
  mail_host: '',
  mail_port: '587',
  mail_username: '',
  mail_password: '',
  mail_encryption: 'tls',
  mail_from_address: '',
  mail_from_name: 'SMMuper'
};

function getMailSettings() {
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE group_name = 'email'").all();
  const s = { ...DEFAULTS };
  for (const r of rows) s[r.key] = r.value;
  return s;
}

function isMailConfigured(s = getMailSettings()) {
  if (!s.mail_host || !s.mail_from_address) return false;
  if (/mailtrap\.io$/i.test(s.mail_host) && !s.mail_username) return false; // untouched placeholder
  return true;
}

const clean = (v) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim();
const ADDRESS_RE = /^[^\s<>@"]+@[^\s<>@"]+\.[^\s<>@"]+$/;
const b64 = (str) => Buffer.from(str, 'utf8').toString('base64');
const wrap76 = (str) => b64(str).replace(/.{76}/g, '$&\r\n');
const encodeHeader = (str) => (/^[\x20-\x7E]*$/.test(str) ? str : `=?UTF-8?B?${b64(str)}?=`);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function formatAddress(name, address) {
  const n = clean(name);
  if (!n) return `<${address}>`;
  const encoded = /^[\x20-\x7E]*$/.test(n) ? `"${n.replace(/["\\]/g, '\\$&')}"` : encodeHeader(n);
  return `${encoded} <${address}>`;
}

function buildMessage({ from, fromName, to, subject, text, html }) {
  const boundary = '=_smmuper_' + crypto.randomBytes(12).toString('hex');
  const domain = from.split('@')[1];
  const lines = [
    `From: ${formatAddress(fromName, from)}`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(clean(subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomBytes(16).toString('hex')}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(text || ''),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(html || escapeHtml(text || '')),
    `--${boundary}--`,
    ''
  ];
  return lines.join('\r\n').replace(/^\./gm, '..');
}

function smtpSend({ host, port, implicitTls, startTls, username, password, from, to, message, tlsOptions = {}, timeoutMs = 20000 }) {
  return new Promise((resolve, reject) => {
    let socket = null;
    let done = false;
    let lineBuf = '';
    let cur = [];
    const replies = [];
    let pending = null;

    const fail = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { socket && socket.destroy(); } catch (e) { /* ignore */ }
      if (pending) { const p = pending; pending = null; p({ code: 0, lines: ['connection error'] }); }
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    const timer = setTimeout(() => fail(new Error('SMTP connection timed out')), timeoutMs);

    const onData = (chunk) => {
      lineBuf += chunk;
      const parts = lineBuf.split(/\r?\n/);
      lineBuf = parts.pop();
      for (const line of parts) {
        cur.push(line);
        if (/^\d{3}( |$)/.test(line)) {
          const reply = { code: parseInt(line.slice(0, 3), 10), lines: cur };
          cur = [];
          if (pending) { const p = pending; pending = null; p(reply); } else replies.push(reply);
        }
      }
    };
    const attach = (sock) => {
      socket = sock;
      sock.setEncoding('utf8');
      sock.on('data', onData);
      sock.on('error', fail);
      sock.on('close', () => fail(new Error('SMTP connection closed unexpectedly')));
    };
    const nextReply = () => (replies.length ? Promise.resolve(replies.shift()) : new Promise((res) => { pending = res; }));
    const expect = async (codes) => {
      const r = await nextReply();
      if (!codes.includes(r.code)) {
        throw new Error(`SMTP error ${r.code || ''}: ${r.lines.join(' ').slice(0, 200)}`.trim());
      }
      return r;
    };
    const write = (line) => socket.write(line + '\r\n');
    const ehloName = clean(from.split('@')[1]) || 'localhost';

    const run = async () => {
      await expect([220]);
      write(`EHLO ${ehloName}`);
      let ehlo = await expect([250]);

      if (startTls) {
        if (!/STARTTLS/i.test(ehlo.lines.join(' '))) throw new Error('SMTP server does not support STARTTLS. Choose "SSL" or "None" in Email Settings.');
        write('STARTTLS');
        await expect([220]);
        const raw = socket;
        raw.removeListener('data', onData);
        const secure = tls.connect({ socket: raw, servername: host, ...tlsOptions });
        await new Promise((res, rej) => { secure.once('secureConnect', res); secure.once('error', rej); });
        lineBuf = ''; cur = []; replies.length = 0;
        attach(secure);
        write(`EHLO ${ehloName}`);
        ehlo = await expect([250]);
      }

      if (username) {
        const caps = ehlo.lines.join(' ');
        if (/AUTH[^\n]*\bPLAIN\b/i.test(caps)) {
          write('AUTH PLAIN ' + b64(`\0${username}\0${password}`));
          await expect([235]);
        } else if (/AUTH[^\n]*\bLOGIN\b/i.test(caps)) {
          write('AUTH LOGIN');
          await expect([334]);
          write(b64(username));
          await expect([334]);
          write(b64(password));
          await expect([235]);
        } else {
          throw new Error('SMTP server does not offer a supported login method.');
        }
      }

      write(`MAIL FROM:<${from}>`);
      await expect([250]);
      write(`RCPT TO:<${to}>`);
      await expect([250, 251]);
      write('DATA');
      await expect([354]);
      socket.write(message + '\r\n.\r\n');
      await expect([250]);
      try { write('QUIT'); } catch (e) { /* ignore */ }
    };

    const connectOpts = { host, port, servername: host, ...tlsOptions };
    const sock = implicitTls ? tls.connect(connectOpts) : net.connect({ host, port });
    attach(sock);
    run().then(() => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { socket.end(); } catch (e) { /* ignore */ }
      resolve();
    }).catch(fail);
  });
}

/**
 * Send one email using the SMTP settings saved in the admin panel.
 * Throws an Error with code MAIL_NOT_CONFIGURED when SMTP details are missing.
 */
async function sendMail({ to, subject, text, html }, opts = {}) {
  const s = opts.settings || getMailSettings();
  if (!isMailConfigured(s)) {
    const err = new Error('Email is not set up yet. Add your SMTP details in Admin → Email Settings.');
    err.code = 'MAIL_NOT_CONFIGURED';
    throw err;
  }
  const recipient = clean(to);
  const from = clean(s.mail_from_address);
  if (!ADDRESS_RE.test(recipient)) throw new Error('Invalid recipient address.');
  if (!ADDRESS_RE.test(from)) throw new Error('The "From" address in Email Settings is not a valid email address.');

  const encryption = String(s.mail_encryption || 'tls').toLowerCase();
  const port = parseInt(s.mail_port, 10) || (encryption === 'ssl' ? 465 : 587);
  const implicitTls = encryption === 'ssl' || port === 465;
  const startTls = !implicitTls && encryption === 'tls';

  const message = buildMessage({ from, fromName: s.mail_from_name, to: recipient, subject, text, html });
  await smtpSend({
    host: clean(s.mail_host),
    port,
    implicitTls,
    startTls,
    username: s.mail_username || '',
    password: s.mail_password || '',
    from,
    to: recipient,
    message,
    tlsOptions: opts.tlsOptions || {}
  });
}

function buildPasswordResetEmail({ username, resetUrl, siteName = 'SMMuper' }) {
  const name = escapeHtml(username || 'there');
  const site = escapeHtml(siteName);
  const url = escapeHtml(resetUrl);
  const text = `Hi ${username || 'there'},\n\nWe received a request to reset your ${siteName} password.\nOpen this link within 1 hour to choose a new password:\n\n${resetUrl}\n\nIf you didn't ask for this, you can ignore this email. Your password will not change.\n\n- ${siteName}`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2430">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px">${site}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;padding-bottom:20px">Hi ${name},<br><br>We received a request to reset your password. Click the button below within 1 hour to choose a new one.</td></tr>
<tr><td style="padding-bottom:20px"><a href="${url}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px">Reset password</a></td></tr>
<tr><td style="font-size:12px;line-height:1.6;color:#6b7280">Or paste this link into your browser:<br><span style="word-break:break-all">${url}</span><br><br>If you didn't ask for this, you can ignore this email. Your password will not change.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: `Reset your ${siteName} password`, text, html };
}

module.exports = { sendMail, getMailSettings, isMailConfigured, buildPasswordResetEmail, buildMessage };
