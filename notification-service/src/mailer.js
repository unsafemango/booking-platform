import nodemailer from 'nodemailer';

/** Uses SMTP when SMTP_HOST is set (Mailpit in docker-compose), otherwise just logs the email. */
export function createMailer({ smtp, mailFrom }, log = console) {
  const transport = smtp.host
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: false,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });

  return async function send({ to, subject, text }) {
    const info = await transport.sendMail({ from: mailFrom, to, subject, text });
    if (!smtp.host) log.info(`[mail] (not sent, no SMTP_HOST) to=${to} subject="${subject}"`);
    return info;
  };
}
