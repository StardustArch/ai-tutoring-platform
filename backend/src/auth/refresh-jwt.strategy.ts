import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from '@nestjs/common';
import * as bcrypt from 'bcrypt';


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
      passReqToCallback: true, // <--- Importante para ler o token do header
    });
  }

  async validate(@Request() req, payload: JwtPayload) {
    const refreshToken = req.get('authorization').replace('Bearer', '').trim();
    // (A lógica de validação é a mesma: o utilizador ainda existe?)
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.hashedRt) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }
    // 2. COMPARAR O TOKEN RECEBIDO COM O HASH NA BD
    const rtMatches = await bcrypt.compare(refreshToken, user.hashedRt);
    if (!rtMatches) throw new ForbiddenException('Acesso Negado');
    // Devolve o payload simples. O 'request.user' terá { sub, userId }
    return { sub: payload.sub, userId: payload.userId };
  }
}