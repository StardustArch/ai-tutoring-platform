import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// Este é o "payload" que guardámos no token
type JwtPayload = {
  sub: string;
  userId: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // --- CORRECÇÃO 1 (Erro TS2345) ---
    // O TypeScript tem razão: configService.get() pode devolver 'undefined'
    // e o 'secretOrKey' não pode ser 'undefined'.
    // Vamos verificar se a chave existe ANTES de a passar ao 'super()'.
    const secret = configService.get<string>('JWT_SECRET_KEY');
    if (!secret) {
      throw new Error('JWT_SECRET_KEY não está definida no ficheiro .env');
    }
    // --- FIM DA CORRECÇÃO 1 ---

    // Configuração do "Guarda"
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // Agora 'secret' é garantidamente uma 'string'
    });
  }

  /**
   * Esta função é chamada AUTOMATICAMENTE pelo Passport
   * DEPOIS de o token ser validado (assinatura e expiração).
   * O que esta função devolve é injectado no 'request.user'
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.userId },
      include: {
        perfilEncarregado: true,
        perfilProfessor: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }

    // --- CORRECÇÃO 2 (Erro TS2790) ---
    // O TypeScript tem razão: não devemos usar 'delete' numa
    // propriedade que não é opcional (o 'passwordHash' é 'string | null').
    // A forma correcta é usar "destructuring" para devolver um
    // novo objecto SEM a password.
    const { passwordHash, ...result } = user;
    
    // Devolve o 'result' (o objecto 'user' SEM o 'passwordHash')
    return result;
    // --- FIM DA CORRECÇÃO 2 ---
  }
}