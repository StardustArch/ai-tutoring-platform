import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Usuario } from '@prisma/client';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailService } from '../mail/mail.service'; // <--- IMPORTANTE
import { randomUUID } from 'node:crypto';

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
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private mailService: MailService, // <--- INJETAR AQUI
        private oauthTempCodes = new Map<
  string,
  { accessToken: string; refreshToken: string }
>()
    ) { }

    generateOAuthCode(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  const code = randomUUID();

  this.oauthTempCodes.set(code, tokens);

  setTimeout(() => {
    this.oauthTempCodes.delete(code);
  }, 60_000);

  return code;
}

exchangeOAuthCode(code: string) {
  const tokens = this.oauthTempCodes.get(code);

  if (!tokens) {
    throw new UnauthorizedException('Código inválido ou expirado');
  }

  this.oauthTempCodes.delete(code);

  return tokens;
}
    // --- REGISTO NORMAL ---
// 1. REGISTAR (ALTERADO)
    async register(dto: RegisterDto) {
        // Verificar se existe
        const userExists = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
        if (userExists) throw new ConflictException('Este email já está registado.');

        const passwordHash = await bcrypt.hash(dto.password, 10);

        // Gerar Token de Verificação (Pode ser um JWT ou um UUID)
        const verificationToken = this.jwtService.sign(
            { email: dto.email }, 
            { secret: this.configService.get('JWT_SECRET_KEY'), expiresIn: '30m' }
        );

        const novoUsuario = await this.prisma.usuario.create({
            data: {
                email: dto.email,
                nome: dto.nome,
                sobrenome: dto.sobrenome,
                telefone: dto?.telefone || '',
                passwordHash: passwordHash,
                ativo: false, // <--- CONTA NASCE INATIVA
                verificationToken: verificationToken, // <--- GUARDAR TOKEN
            },
            include: { perfilEncarregado: true },
        });

        // ENVIAR EMAIL DE VERIFICAÇÃO (Em vez de boas-vindas)
        this.mailService.sendVerificationEmail(novoUsuario.email, novoUsuario.nome, verificationToken)
            .catch(e => console.error(e));

        return { message: 'Registo efetuado. Verifique o seu email para ativar a conta.' };
    }

    // 2. CONFIRMAR EMAIL (NOVO MÉTODO)
    async confirmEmail(token: string) {
        try {
            // Verificar se o token é válido
            const payload = this.jwtService.verify(token, { 
                secret: this.configService.get('JWT_SECRET_KEY') 
            });

            const user = await this.prisma.usuario.findUnique({ where: { email: payload.email } });
            
            if (!user) throw new BadRequestException('Utilizador inválido.');
            if (user.ativo) return { message: 'Conta já verificada.' };
            
            // Verificar se o token da BD bate com o recebido (segurança extra)
            if (user.verificationToken !== token) throw new BadRequestException('Token inválido.');

            // ATIVAR CONTA
            await this.prisma.usuario.update({
                where: { id: user.id },
                data: { 
                    ativo: true, 
                    verificationToken: null // Limpar token
                }
            });

            // Agora sim, enviamos as boas-vindas
            this.mailService.sendWelcome(user.email, user.nome).catch(e => console.error(e));

            return { message: 'Conta ativada com sucesso! Pode fazer login.' };

        } catch (e) {
            throw new BadRequestException('Link de verificação inválido ou expirado.');
        }
    }

    // --- LOGIN NORMAL ---
    async login(dto: LoginDto): Promise<TokenResponse> {
      

        // 1. Validar utilizador
        const usuario = await this.validateUserInternal(dto.email, dto.password);
        if (!usuario) {
            throw new UnauthorizedException('Email ou password inválidos.');
        }
        
        // Verificar se está bloqueado
        if (!usuario.ativo) {
             throw new UnauthorizedException('A sua conta foi desativada. Contacte o suporte.');
        }

        // 2. Gerar Tokens
        const payload = { sub: usuario.email, userId: usuario.id, role: usuario.role };
        
        const [accessToken, refreshToken] = await this.generateTokens(payload);
        await this.updateRtHash(usuario.id, refreshToken);

        return { accessToken, refreshToken };
    }

    // Função interna auxiliar para validar password (substitui a tua validateUser antiga)
    async validateUserInternal(email: string, pass: string): Promise<Usuario | null> {
        const usuario = await this.prisma.usuario.findUnique({ where: { email } });
        
        if (usuario && usuario.passwordHash && (await bcrypt.compare(pass, usuario.passwordHash))) {
            return usuario;
        }
        return null;
    }

    // --- OAUTH (GOOGLE) ---
    async validateOAuthUser(payload: OAuthPayload): Promise<Usuario> {
       
        
        let user = await this.prisma.usuario.findUnique({ where: { oauthId: payload.oauthId } });
        if (user) return user; 

        user = await this.prisma.usuario.findUnique({ where: { email: payload.email } });

        if (user) {
            return this.prisma.usuario.update({
                where: { email: payload.email },
                data: { oauthId: payload.oauthId, oauthProvider: payload.oauthProvider },
            });
        }

       
        const newUser = await this.prisma.usuario.create({
            data: {
                email: payload.email,
                nome: payload.nome,
                sobrenome: payload.sobrenome,
                telefone: '', 
                oauthId: payload.oauthId,
                oauthProvider: payload.oauthProvider,
                ativo: true
            },
        });

        // 📧 ENVIAR BOAS-VINDAS (Apenas para novos registos OAuth)
        this.mailService.sendWelcome(newUser.email, newUser.nome).catch(e => console.error(e));

        return newUser;
    }
  
    async loginOAuth(user: Usuario): Promise<TokenResponse> {
        if (!user.ativo) throw new UnauthorizedException('Conta desativada.');

        const payload = { sub: user.email, userId: user.id, role: user.role };
        const [accessToken, refreshToken] = await this.generateTokens(payload);
        await this.updateRtHash(user.id, refreshToken);
        return { accessToken, refreshToken };
    }

    // --- RECUPERAÇÃO DE SENHA ---
    
    // 1. Pedir Reset
    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.prisma.usuario.findUnique({ where: { email: dto.email } });

        if (!user) {
            // Segurança: Fingir que deu certo
            return { message: 'Se o email existir, receberá um link de recuperação4.' };
        }
        
        if (!user.ativo) throw new UnauthorizedException('Conta desativada.');
        if (!user.passwordHash) {
             // Caso raro: User OAuth tenta recuperar senha. 
             // O ideal seria mandar email a dizer "Usa o Google Login".
             return { message: 'Use o login com Google.' };
        }

        // Gerar Token de Reset (JWT curto - 1 hora)
        // Usamos o segredo + passwordHash para que, se o user mudar a senha, o link morra logo.
        const secret = this.configService.get('JWT_SECRET_KEY') + user.passwordHash;
        const payload = { email: user.email, id: user.id };
        const token = this.jwtService.sign(payload, { secret, expiresIn: '1h' });

        // 📧 ENVIAR EMAIL REAL
        await this.mailService.sendPasswordReset(user.email, token, user.nome);

        return { message: 'Email de recuperação enviado.' };
    }

    // 2. Confirmar Reset (Link do Email)
    async resetPassword(dto: ResetPasswordDto) {
        // Primeiro precisamos saber QUEM é o user para recriar o segredo de validação
        // O token JWT tem o ID lá dentro (decodificar sem verificar primeiro)
        const decoded: any = this.jwtService.decode(dto.token);
        if (!decoded || !decoded.id) throw new BadRequestException('Token inválido.');

        const user = await this.prisma.usuario.findUnique({ where: { id: decoded.id } });
        if (!user) throw new BadRequestException('Utilizador inválido.');

        // Recriar o segredo para verificar a assinatura
        const secret = this.configService.get('JWT_SECRET_KEY') + user.passwordHash;

        try {
            this.jwtService.verify(dto.token, { secret });
        } catch (e) {
            throw new BadRequestException('Link expirado ou inválido.');
        }

        // Tudo OK, alterar senha
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(dto.newPassword, salt);

        await this.prisma.usuario.update({
            where: { id: user.id },
            data: { passwordHash: hash },
        });

        return { message: 'Senha alterada com sucesso!' };
    }

    // --- UTILS ---

    async refreshTokens(userId: number, email: string): Promise<TokenResponse> {
        const user = await this.prisma.usuario.findUnique({ where: { id: userId } });
        if (!user || !user.ativo) throw new UnauthorizedException('Acesso negado.');

        const payload = { sub: email, userId: userId, role: user.role };
        const [at, rt] = await this.generateTokens(payload);
        await this.updateRtHash(userId, rt);
        return { accessToken: at, refreshToken: rt };
    }

    async updateRtHash(userId: number, rt: string) {
        const hash = await bcrypt.hash(rt, 10);
        await this.prisma.usuario.update({
            where: { id: userId },
            data: { hashedRt: hash },
        });
    }

    async logout(userId: number) {
        await this.prisma.usuario.updateMany({
            where: { id: userId, hashedRt: { not: null } },
            data: { hashedRt: null },
        });
    }

    async changePassword(userId: number, dto: ChangePasswordDto) {
        const user = await this.prisma.usuario.findUnique({ where: { id: userId } });
        if (!user || !user.passwordHash) throw new NotFoundException('Utilizador inválido.');

        const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!isMatch) throw new BadRequestException('A senha atual está incorreta.');

        const salt = await bcrypt.genSalt();
        const newHash = await bcrypt.hash(dto.newPassword, salt);

        await this.prisma.usuario.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        });

        return { message: 'Senha atualizada.' };
    }

    // Helper para não repetir código
    private async generateTokens(payload: any): Promise<[string, string]> {
        return Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_SECRET_KEY'),
                expiresIn: '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET_KEY'),
                expiresIn: '7d',
            }),
        ]);
    }
}