import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

  // Função centralizada para disparar o pedido HTTP
private async sendViaApi(to: string, subject: string, htmlContent: string) {
    try {
      // Garantimos que a chave existe ou passamos uma string vazia para o TS não chorar
      const apiKey = process.env.BREVO_API_KEY || '';

      const response = await fetch(this.BREVO_API_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey, // Agora é garantidamente uma string
        } as any, // O "as any" aqui é o segredo para o TS ignorar o erro de overload
        body: JSON.stringify({
          sender: { 
            name: 'KaniMente', 
            email: process.env.EMAIL_FROM 
          },
          to: [{ email: to }],
          subject: subject,
          htmlContent: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error(`❌ Erro API Brevo: ${JSON.stringify(errorData)}`);
        return false;
      }

      this.logger.log(`✅ Email enviado com sucesso para ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`❌ Falha na conexão com Brevo: ${error.message}`);
      return false;
    }
  }

  async sendPasswordReset(email: string, token: string, nome: string) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/confirm?token=${token}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #4F46E5;">KaniMente</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Recebemos um pedido para recuperar a tua senha.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Redefinir Minha Senha
          </a>
        </div>
      </div>`;
    return this.sendViaApi(email, 'Recuperação de Senha - KaniMente', html);
  }

  async sendWelcome(email: string, nome: string) {
    const html = `
      <div style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #4F46E5;">Bem-vindo ao KaniMente!</h2>
        <p>Olá <strong>${nome}</strong>, estamos maningue felizes por te teres juntado a nós.</p>
      </div>`;
    return this.sendViaApi(email, 'Bem-vindo ao KaniMente!', html);
  }

  async sendVerificationEmail(email: string, nome: string, token: string) {
    const url = `${process.env.FRONTEND_URL}/register/verify-email?token=${token}`;
    const html = `
      <div style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #4F46E5;">Confirma o teu email 📧</h2>
        <p>Olá ${nome}, ativa a tua conta aqui:</p>
        <a href="${url}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ativar Conta</a>
      </div>`;
    return this.sendViaApi(email, 'Activar conta KaniMente', html);
  }
}