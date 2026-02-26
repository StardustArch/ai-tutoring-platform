import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MailService } from './mail/mail.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // No app.controller.ts (apenas para teste)
  @Get('test-email')
  testEmail() {
    return this.mailService.sendPasswordReset(
      'paulocandrinho@protonmail.com',
      '12345',
      'Paulo Teste',
    );
  }
}
