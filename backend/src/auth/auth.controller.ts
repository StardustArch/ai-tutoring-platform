import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Res,
  UnauthorizedException,
  Patch,
} from '@nestjs/common';
import { AuthService, TokenResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import express from 'express'; // ← CORRETO: Import do Express
import { ConfigService } from '@nestjs/config'; // <-- 4. IMPORTAR 'ConfigService'

import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('api/auth') // Define o prefixo da rota (ex: /api/auth/...)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService, // <-- 5. INJECTAR 'ConfigService'
  ) {}

  /**
   * Rota para Registar um Encarregado
   * POST /api/auth/register/encarregado
   */
  @Post('register')
  async registerEncarregado(@Body(new ValidationPipe()) dto: RegisterDto) {
    // O 'ValidationPipe' usa 'class-validator' para validar o DTO
    return this.authService.register(dto);
  }

  // src/auth/auth.controller.ts

@Post('confirm-email')
async confirmEmail(@Body('token') token: string) {
    return this.authService.confirmEmail(token);
}

  /**
   * Rota para Login (Token)
   * POST /api/auth/token
   */
  @Post('token')
  @HttpCode(HttpStatus.OK) // Por defeito, POST devolve 201, mas para login queremos 200
  async login(
    @Body(new ValidationPipe()) dto: LoginDto,
  ): Promise<TokenResponse> {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('jwt-refresh')) // <-- 4. PROTEGER a rota com o "Guarda" de refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Request() req): Promise<TokenResponse> {
    // 'req.user' é o payload { sub, userId } que o
    // nosso 'RefreshJwtStrategy' validou e devolveu.
    const userId = req.user.userId;
    const email = req.user.sub;

    // 5. Chamar o "Cérebro" para gerar novos tokens
    return this.authService.refreshTokens(userId, email);
  }

  /**
   * Rota para INICIAR o fluxo OAuth
   * GET /api/auth/google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Não colocar nada aqui.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Request() req,
    @Res() res: express.Response, // ← CORRETO: Response do Express
  ) {
    try {
      const user = req.user;
      const tokens = await this.authService.loginOAuth(user);

      // CORREÇÃO: Garantir que frontendUrl não é undefined
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      if (!frontendUrl) {
        throw new Error(
          'FRONTEND_URL não está definida nas variáveis de ambiente',
        );
      }

      // Remove comentários se existirem
      const cleanFrontendUrl = frontendUrl.split(' #')[0].trim();

      const redirectUrl = `${cleanFrontendUrl}/auth-callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      console.log('Redirecionando para:', redirectUrl);

      // CORRETO: redirect() do Express
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('[Google Callback ERROR]', error);

      // CORREÇÃO: Garantir que frontendUrl não é undefined no catch também
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
      const cleanFrontendUrl = frontendUrl.split(' #')[0].trim();

      return res.redirect(
        `${cleanFrontendUrl}/auth-callback?error=oauth_failed`,
      );
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  async logout(@Request() req) {
    console.log(req.user)
    return this.authService.logout(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
