import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Usuario } from '@prisma/client'; // Importar o tipo 'Usuario'
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';


// Definir a forma da resposta do Token
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
}

type OAuthPayload = {
  email: string;
  nome: string;
  sobrenome: string;
  oauthId: string;
  oauthProvider: string;
};
@Injectable()
export class AuthService {
    // Injectar as nossas ferramentas (Prisma, JWT, Config)
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    /**
     * Lógica de Registo (o "Cérebro")
     */
    async register(dto: RegisterDto) {
        console.log('[AuthService] A processar registo de Encarregado para:', dto.email);

        // 1. Verificar se o utilizador já existe
        const userExists = await this.prisma.usuario.findUnique({
            where: { email: dto.email },
        });

        if (userExists) {
            // Se o email já existe, falhar
            throw new ConflictException('Este email já está registado.');
        }

        // 2. Fazer o Hash da password
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // 3. Criar o Utilizador e o Perfil de Encarregado (numa só transacção)
        const novoUsuario = await this.prisma.usuario.create({
            data: {
                email: dto.email,
                nome: dto.nome, // <-- CORRIGIDO
                sobrenome: dto.sobrenome, // <-- NOVO
                telefone: dto.telefone, // <-- NOVO
                passwordHash: passwordHash, 
            },
            // Pedir ao Prisma para incluir o perfil na resposta
            include: {
                perfilEncarregado: true,
            },
        });

        // Remover a password antes de devolver a resposta
        novoUsuario.passwordHash;
        return novoUsuario;
    }

    /**
     * Lógica de Login (o "Cérebro")
     */
    async login(dto: LoginDto): Promise<TokenResponse> {
        console.log('[AuthService] A processar login para:', dto.email);

        // 1. Validar o utilizador
        const usuario = await this.validateUser(dto.email, dto.password);
        if (!usuario) {
            throw new UnauthorizedException('Email ou password inválidos.');
        }

        // 2. Criar o Payload do Token (o que guardamos lá dentro)
        const payload = { sub: usuario.email, userId: usuario.id };

        // 3. Gerar os dois tokens (Access e Refresh)
        const [accessToken, refreshToken] = await Promise.all([
            // Access Token (Curto - 15m)
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_SECRET_KEY'),
                expiresIn: '15m',
            }),
            // Refresh Token (Longo - 7d)
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET_KEY'), // (Vamos adicionar isto ao .env)
                expiresIn: '7d',
            }),
        ]);

            await this.updateRtHash(usuario.id, refreshToken);

        return {
            accessToken,
            refreshToken,
        };
    }

    /**
     * Função auxiliar para validar a password
     */
    /**
       * Função auxiliar para validar a password
       * (COM A CORRECÇÃO DO BUG TS2345)
       */
    async validateUser(email: string, pass: string): Promise<any> {
        const usuario = await this.prisma.usuario.findUnique({
            where: { email },
        });

        // --- A CORRECÇÃO ESTÁ AQUI ---
        // Verificamos se 'usuario' existe E
        // se 'usuario.passwordHash' existe (não é null) ANTES
        // de o passarmos ao bcrypt.
        if (
            usuario &&
            usuario.passwordHash &&
            (await bcrypt.compare(pass, usuario.passwordHash))
        ) {
            // Se tudo estiver OK, apagar o hash e devolver o utilizador
            usuario.passwordHash;
            return usuario;
        }
        // --- FIM DA CORRECÇÃO ---

        return null; // Falhou
    }

      async refreshTokens(userId: number, email: string): Promise<TokenResponse> {
    console.log(`[AuthService] A refrescar tokens para: ${email}`);
    
    // A lógica é simples: apenas geramos um novo par de tokens
    // para este utilizador que já foi validado pelo "Guarda".
    
    const payload = { sub: email, userId: userId };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      // Novo Access Token (Curto - 15m)
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET_KEY'),
        expiresIn: '15m',
      }),
      // Novo Refresh Token (Longo - 7d)
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET_KEY'),
        expiresIn: '7d',
      }),
    ]);
    await this.updateRtHash(userId, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

    // --- NOVO: Lógica "Procurar ou Criar" para o Google ---
  async validateOAuthUser(payload: OAuthPayload): Promise<Usuario> {
    console.log(`[AuthService] Validando utilizador OAuth: ${payload.email}`);
    
    // 1. Tentar encontrar o utilizador pelo seu ID do Google
    let user = await this.prisma.usuario.findUnique({
      where: { oauthId: payload.oauthId },
    });
    if (user) {
      console.log('Utilizador encontrado pelo oauthId');
      return user; // Login bem-sucedido
    }

    // 2. Não encontrou pelo ID. Tentar encontrar pelo email
    user = await this.prisma.usuario.findUnique({
      where: { email: payload.email },
    });

    if (user) {
      // 3. Utilizador existe mas (provavelmente) registou-se com password.
      // Vamos *ligar* a conta Google a este utilizador.
      console.log('Utilizador encontrado pelo email. A ligar conta Google...');
      user = await this.prisma.usuario.update({
        where: { email: payload.email },
        data: {
          oauthId: payload.oauthId,
          oauthProvider: payload.oauthProvider,
        },
      });
      return user;
    }

    // 4. Utilizador não existe de todo. Criar um novo.
    console.log('Utilizador não encontrado. A criar novo utilizador OAuth...');
    user = await this.prisma.usuario.create({
      data: {
        email: payload.email,
        nome: payload.nome,
        sobrenome: payload.sobrenome,
        telefone: '', // (Pode ser preenchido mais tarde)
        oauthId: payload.oauthId,
        oauthProvider: payload.oauthProvider,
        // (passwordHash fica 'null', como planeado)
      },
    });

    return user;
  }
  
  // --- NOVO: Gerador de Tokens para OAuth ---
  // (O 'login' normal não serve porque exige password)
  async loginOAuth(user: Usuario): Promise<TokenResponse> {
    console.log(`[AuthService] Gerando tokens para utilizador OAuth: ${user.email}`);
    
    const payload = { sub: user.email, userId: user.id };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET_KEY'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET_KEY'),
        expiresIn: '7d',
      }),
    ]);

    await this.updateRtHash(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }


    // 1. PEDIR RECUPERAÇÃO
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Por segurança, não dizemos se o email existe ou não, mas retornamos sucesso.
      // Mas para debug, vamos logar.
      console.log(`[Auth] Tentativa de reset para email inexistente: ${dto.email}`);
      return { message: 'Se o email existir, receberá um link de recuperação.' };
    }

    // Gerar um token temporário assinado com o segredo da app + hash da senha atual (para invalidar se a senha mudar entretanto)
    const payload = { sub: user.id, email: user.email, type: 'reset' };
    const token = this.jwtService.sign(payload, { expiresIn: '1h' });

    // LINK PARA O FRONTEND (Ajuste a porta se o seu frontend rodar noutra porta, ex: 5173)
    const resetLink = `http://localhost:5173/reset-password/confirm?token=${token}`;

    // --- SIMULAÇÃO DE EMAIL ---
    console.log('=========================================================');
    console.log('📧 EMAIL DE RECUPERAÇÃO (SIMULADO)');
    console.log(`Para: ${user.email}`);
    console.log(`Link: ${resetLink}`);
    console.log('=========================================================');

    return { message: 'Email de recuperação enviado (verifique a consola do servidor).' };
  }

  // 2. CONFIRMAR NOVA SENHA
  async resetPassword(dto: ResetPasswordDto) {
    try {
      // Verificar o token
      const payload = this.jwtService.verify(dto.token);

      if (payload.type !== 'reset') {
        throw new BadRequestException('Token inválido.');
      }

      const user = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
      });

      if (!user) throw new NotFoundException('Utilizador não encontrado.');

      // Hash da nova senha
      const salt = await bcrypt.genSalt();
      const hash = await bcrypt.hash(dto.newPassword, salt);

      // Atualizar na BD
      await this.prisma.usuario.update({
        where: { id: user.id },
        data: { passwordHash: hash },
      });

      return { message: 'Senha alterada com sucesso! Pode fazer login agora.' };

    } catch (error) {
      throw new BadRequestException('Link de recuperação inválido ou expirado.');
    }
  }

   async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new NotFoundException('Utilizador inválido.');

    // Verificar senha atual
    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestException('A senha atual está incorreta.');

    // Hash da nova senha
    const salt = await bcrypt.genSalt();
    const newHash = await bcrypt.hash(dto.newPassword, salt);

    // Atualizar
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Senha atualizada com sucesso.' };
  }

  async updateRtHash(userId: number, rt: string) {
  const hash = await bcrypt.hash(rt, 10);
  await this.prisma.usuario.update({
    where: { id: userId },
    data: { hashedRt: hash },
  });
}

async logout(userId: number) {
  // Ao definir como NULL, o token que está no browser deixa de valer
  // porque a comparação vai falhar.
  await this.prisma.usuario.updateMany({
    where: {
      id: userId,
      hashedRt: { not: null }, // Só atualiza se tiver hash
    },
    data: { hashedRt: null },
  });
}
}