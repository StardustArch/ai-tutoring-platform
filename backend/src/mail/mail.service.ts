import { Injectable, Logger } from '@nestjs/common';
import * as Brevo from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private apiInstance: Brevo.TransactionalEmailsApi;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Inicializa o cliente do Brevo
    this.apiInstance = new Brevo.TransactionalEmailsApi();
    this.apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY,
    );
  }

  // Função auxiliar para evitar repetição de código (DRY)
  private async sendBrevoEmail(to: string, subject: string, htmlContent: string) {
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { 
      name: 'KaniMente', 
      email: process.env.EMAIL_FROM 
    };
    sendSmtpEmail.to = [{ email: to }];

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`✅ Email enviado com sucesso para ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erro no Brevo ao enviar para ${to}:`, error.response?.body || error.message);
      return false;
    }
  }

  async sendPasswordReset(email: string, token: string, nome: string) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/confirm?token=${token}`;
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4F46E5; margin: 0;">KaniMente</h2>
          <p style="color: #64748b; font-size: 14px;">Educação Inteligente</p>
        </div>
        <div style="color: #334155; line-height: 1.6;">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Recebemos um pedido para recuperar a tua senha.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Redefinir Minha Senha
            </a>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">Ou copia este link: <br> ${resetLink}</p>
        </div>
      </div>`;

    return this.sendBrevoEmail(email, 'Recuperação de Senha - KaniMente', htmlTemplate);
  }

  async sendWelcome(email: string, nome: string) {
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
        <h2 style="color: #4F46E5;">Bem-vindo ao KaniMente!</h2>
        <p>Olá <strong>${nome}</strong>, estamos muito felizes por te teres juntado a nós.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
          Entrar na Plataforma
        </a>
      </div>`;

    return this.sendBrevoEmail(email, 'Bem-vindo ao KaniMente!', htmlTemplate);
  }

  async sendVerificationEmail(email: string, nome: string, token: string) {
    const url = `${process.env.FRONTEND_URL}/register/verify-email?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #4F46E5;">Confirme o seu email 📧</h2>
        <p>Olá ${nome}, clica no botão abaixo para ativar a tua conta:</p>
        <a href="${url}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-top: 20px;">
          Ativar Conta
        </a>
      </div>`;

    return this.sendBrevoEmail(email, 'Activar conta KaniMente', html);
  }
} 