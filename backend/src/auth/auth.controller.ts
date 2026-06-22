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
  Delete,
} from '@nestjs/common';
import { AuthService, TokenResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import express from 'express';
import { ConfigService } from '@nestjs/config';

import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Rota para Registar um Encarregado
   * POST /api/auth/register/encarregado
   */
  @Post('register')
  async registerEncarregado(@Body(new ValidationPipe()) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('confirm-email')
  async confirmEmail(@Body() dto: ConfirmEmailDto) {
    return this.authService.confirmEmail(dto.token);
  }

  /**
   * Rota para Login (Token)
   * POST /api/auth/token
   */
  @Post('token')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ValidationPipe()) dto: LoginDto,
  ): Promise<TokenResponse> {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Request() req): Promise<TokenResponse> {
    const userId = req.user.userId;
    const email = req.user.sub;

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
  async googleAuthCallback(@Request() req, @Res() res: express.Response) {
    try {
      const user = req.user;
      const tokens = await this.authService.loginOAuth(user);

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      if (!frontendUrl) {
        throw new Error(
          'FRONTEND_URL não está definida nas variáveis de ambiente',
        );
      }

      const cleanFrontendUrl = frontendUrl.split(' #')[0].trim();

      const code = this.authService.generateOAuthCode(tokens);

      const redirectUrl = `${cleanFrontendUrl}/auth-callback?code=${code}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('[Google Callback ERROR]', error);

      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
      const cleanFrontendUrl = frontendUrl.split(' #')[0].trim();

      return res.redirect(
        `${cleanFrontendUrl}/auth-callback?error=oauth_failed`,
      );
    }
  }

  @Post('exchange-code')
  @HttpCode(HttpStatus.OK)
  exchangeCode(@Body('code') code: string) {
    return this.authService.exchangeOAuthCode(code);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete-account')
  async deleteAccount(@Request() req) {
    const userId = req.user.id;
    return this.authService.deleteAccount(userId);
  }
}
