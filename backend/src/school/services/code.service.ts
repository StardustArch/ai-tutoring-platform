import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CodeService {
  constructor(private prisma: PrismaService) {}

  async gerarCodigoProfessor(usuarioId: number, validoAte?: string) {
  const administrador = await this.prisma.administradorEscola.findFirst({
    where: { 
      usuarioId,
      isVerificado: true
    }
  });

  if (!administrador) {
    throw new ForbiddenException('Não tem permissão para gerar códigos');
  }

  // Gerar código único (6 caracteres alfanuméricos)
  const codigo = this.gerarCodigoUnico(6);
  
  // Definir data de validade (padrão: 30 dias)
  const validoAteDate = validoAte 
    ? new Date(validoAte)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

  const codigoProfessor = await this.prisma.codigoProfessor.create({
    data: {
      codigo,
      escolaId: administrador.escolaId,
      criadoPor: usuarioId,
      validoAte: validoAteDate,
    }
  });

  return {
    codigo: codigoProfessor,
    mensagem: 'Código gerado com sucesso'
  };
}

  async ativarProfessorComCodigo(usuarioId: number, codigo: string) {
    const codigoProfessor = await this.prisma.codigoProfessor.findUnique({
      where: { codigo },
      include: { escola: true }
    });

    if (!codigoProfessor) throw new NotFoundException('Código inválido');
    if (codigoProfessor.isUsado) throw new BadRequestException('Este código já foi utilizado');
    if (codigoProfessor.validoAte < new Date()) throw new BadRequestException('Este código expirou');
    if (!codigoProfessor.ativo) throw new BadRequestException('Este código foi desativado');

    const professorExistente = await this.prisma.professor.findUnique({
      where: { usuarioId }
    });

    if (professorExistente) {
      throw new BadRequestException('Já possui um perfil de professor');
    }

    const professor = await this.prisma.professor.create({
      data: {
        usuarioId,
        escolaId: codigoProfessor.escolaId,
        isVerificado: true,
      },
      include: {
        escola: true,
        usuario: { select: { nome: true, email: true } }
      }
    });

    await this.prisma.codigoProfessor.update({
      where: { id: codigoProfessor.id },
      data: {
        isUsado: true,
        usadoPor: usuarioId,
        usadoEm: new Date()
      }
    });

    return {
      success: true,
      professor: {
        nome: professor.usuario.nome,
        escola: professor.escola?.nome,
      },
      mensagem: 'Perfil de professor ativado com sucesso!'
    };
  }

  async listarCodigosEscola(escolaId: number, administradorId: number) {
    const administrador = await this.prisma.administradorEscola.findFirst({
      where: { usuarioId: administradorId, escolaId }
    });

    if (!administrador) {
      throw new ForbiddenException('Não tem permissão para ver códigos desta escola');
    }

    return this.prisma.codigoProfessor.findMany({
      where: { escolaId },
      include: {
        escola: { select: { nome: true } }
      },
      orderBy: { criadoEm: 'desc' }
    });
  }

private gerarCodigoUnico(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}


async revogarCodigo(codigoId: number, usuarioId: number) {
  const administrador = await this.prisma.administradorEscola.findFirst({
    where: { 
      usuarioId,
      isVerificado: true
    }
  });

  if (!administrador) {
    throw new ForbiddenException('Não tem permissão para revogar códigos');
  }

  const codigo = await this.prisma.codigoProfessor.findFirst({
    where: {
      id: codigoId,
      escolaId: administrador.escolaId
    }
  });

  if (!codigo) {
    throw new NotFoundException('Código não encontrado');
  }

  if (codigo.isUsado) {
    throw new BadRequestException('Não é possível revogar um código já utilizado');
  }

  const codigoAtualizado = await this.prisma.codigoProfessor.update({
    where: { id: codigoId },
    data: { ativo: false }
  });

  return {
    codigo: codigoAtualizado,
    mensagem: 'Código revogado com sucesso'
  };
}

}