import { Controller, Get, Logger, Query } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('api/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly httpService: HttpService) {}

  // Adicionamos o @Query() aqui
  @Get('wakeup')
  async wakeup(@Query('wakeAi') wakeAi?: string) {
    this.logger.log('⏰ Ping recebido! Backend NestJS está vivo.');

    // Só acorda a IA (Python) se o pedido tiver ?wakeAi=true
    if (wakeAi === 'true') {
      const aiUrl = process.env.IA_API_URL || 'https://ai-tutoring-platform.onrender.com';
      
      try {
        firstValueFrom(this.httpService.get(`${aiUrl}/health`)).catch(() => {
            this.logger.log('⏳ Frontend detetado! A acordar o Serviço de IA (Python)...');
        });
      } catch (error) {}

      return { status: 'ok', message: 'Backend vivo. A acordar IA em background...' };
    }

    // Se for o UptimeRobot ou Google Script (não têm wakeAi=true)
    this.logger.log('🤖 Ping de manutenção (Robô). A IA continua a dormir para poupar horas.');
    return { status: 'ok', message: 'Backend vivo. Modo poupança de IA ativo.' };
  }
}