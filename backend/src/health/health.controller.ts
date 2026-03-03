import { Controller, Get, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('api/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly httpService: HttpService) {}

  @Get('wakeup')
  async wakeup() {
    this.logger.log('⏰ Ping recebido do Frontend! Backend NestJS está acordado.');

    // Enviar Ping em cascata para o serviço de IA (Python)
    const aiUrl = process.env.IA_API_URL || 'https://ai-tutoring-platform.onrender.com';
    
    try {
      // Fazemos um GET simples à raiz ou a uma rota /health do Python
      // Não usamos await para o Frontend não ficar 50s à espera da resposta do NestJS
      firstValueFrom(this.httpService.get(`${aiUrl}/health`)).catch(() => {
          this.logger.log('⏳ Serviço IA (Python) a acordar...');
      });
    } catch (error) {
      // Ignoramos erros, o objetivo era só enviar tráfego para acordar a máquina
    }
    return { 
        status: 'ok', 
        message: 'Bom dia! Backend NestJS acordado. A acordar IA em background...' 
    };
  }
}