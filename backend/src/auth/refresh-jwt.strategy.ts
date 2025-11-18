import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  userId: number;
};

@Injectable()
// Damos-lhe um nome único ('jwt-refresh')
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_REFRESH_SECRET_KEY');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET_KEY não está definida no .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // --- A MUDANÇA CRÍTICA ---
      // Este "Guarda" usa a chave secreta do REFRESH token
      secretOrKey: secret, 
    });
  }

  async validate(payload: JwtPayload) {
    // (A lógica de validação é a mesma: o utilizador ainda existe?)
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }
    
    // Devolve o payload simples. O 'request.user' terá { sub, userId }
    return { sub: payload.sub, userId: payload.userId };
  }
}