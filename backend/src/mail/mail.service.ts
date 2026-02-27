import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // O 'as any' é para o TS não dar erro, mas o Nodemailer vai ler isto!
      family: 4, 
    } as any);
  }

  async sendPasswordReset(email: string, token: string, nome: string) {
    // Link para o teu Frontend (Vercel ou Localhost)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/confirm?token=${token}`;
    
    // HTML "Enterprise" Simples
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4F46E5; margin: 0;">KaniMente</h2>
          <p style="color: #64748b; font-size: 14px;">Educação Inteligente</p>
        </div>
        
        <div style="color: #334155; line-height: 1.6;">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Recebemos um pedido para recuperar a tua senha. Se não foste tu, podes ignorar este email com segurança.</p>
          <p>Para criar uma nova senha, clica no botão abaixo:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Redefinir Minha Senha
            </a>
          </div>

          <p style="font-size: 12px; color: #94a3b8;">Ou copia este link: <br> ${resetLink}</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
          <p>&copy; 2026 KaniMente. Enviado automaticamente pelo sistema.</p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Recuperação de Senha - KaniMente',
        html: htmlTemplate,
      });
      this.logger.log(`Email enviado para ${email}`);
      console.log(`Email enviado para ${email}`)
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar email para ${email}`, error);
            console.log(`Erro ao enviar email para ${email}`, error)
            this.logger.error(`Falha total no envio para ${email}: ${error.message}`);

      return false;
    }
  }


  async sendWelcome(email: string, nome: string) {
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
        <h2 style="color: #4F46E5;">Bem-vindo ao KaniMente!</h2>
        <p>Olá <strong>${nome}</strong>, estamos muito felizes por te teres juntado a nós.</p>
        <p>Prepara-te para uma nova forma de aprender.</p>
        <br>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Entrar na Plataforma
        </a>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Bem-vindo ao KaniMente!',
        html: htmlTemplate,
      });
      console.log("true")
    } catch (error) {
      this.logger.error(`Erro ao enviar boas-vindas para ${email}`, error);
      this.logger.error(`Falha total no envio para ${email}: ${error.message}`);
    }
  }


async sendVerificationEmail(email: string, nome: string, token: string) {
    // Link aponta para uma página do frontend que vamos criar
    const url = `${process.env.FRONTEND_URL}/register/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #4F46E5;">Confirme o seu email 📧</h2>
        <p>Olá ${nome}, falta pouco para entrares no KaniMente.</p>
        <p>Clica no botão abaixo para ativar a tua conta:</p>
        <br>
        <a href="${url}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ativar Conta
        </a>
        <br><br>
        <p style="font-size: 12px; color: #666;">Se não criou esta conta, ignore este email.</p>
      </div>
    `;
try {
  
  await this.transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Activar conta KaniMente',
      html: html,
  });
} catch (error) {
  this.logger.error(`Falha total no envio para ${email}: ${error.message}`);
}
}
}