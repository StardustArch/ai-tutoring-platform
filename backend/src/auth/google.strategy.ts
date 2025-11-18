import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    // Verificação das variáveis de ambiente
    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'ERRO: Variáveis de ambiente do Google OAuth não definidas.',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: true, // ← MUDE PARA true
    });
  }

  async validate(
    req: any, // ← ADICIONE ESTE PARÂMETRO
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ) {
    console.log('[GoogleStrategy] Perfil recebido do Google:', profile.displayName);

    try {
      const email = profile.emails?.[0]?.value;
      const nome = profile.name?.givenName ?? '';
      const sobrenome = profile.name?.familyName ?? '';
      const oauthId = profile.id;

      if (!email) {
        return done(new Error('Email não fornecido pelo Google.'));
      }

      const user = await this.authService.validateOAuthUser({
        email,
        nome,
        sobrenome,
        oauthId,
        oauthProvider: 'google',
      });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
}