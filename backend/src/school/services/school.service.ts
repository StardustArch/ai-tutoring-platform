// src/school/school.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService) {}

  // ========== GESTÃO DE ESCOLAS ==========

  async criarEscola(dto: any, usuarioId: number) {
    // Verificar se usuário já é administrador de alguma escola
    const adminExistente = await this.prisma.administradorEscola.findFirst({
      where: { usuarioId, isVerificado: true }
    });

    if (adminExistente) {
      throw new BadRequestException('Já é administrador de uma escola verificada');
    }

    const escola = await this.prisma.escola.create({
      data: {
        nome: dto.nome,
        codigo: dto.codigo,
        localizacao: dto.localizacao,
        emailInstitucional: dto.emailInstitucional,
        telefoneInstitucional: dto.telefoneInstitucional,
        isVerificada: false,
      }
    });

    // Criar administrador
    const administrador = await this.prisma.administradorEscola.create({
      data: {
        usuarioId,
        escolaId: escola.id,
        isVerificado: false,
      },
      include: {
        usuario: true,
        escola: true
      }
    });

    return {
      escola,
      administrador,
      requerVerificacao: true,
      mensagem: 'Escola criada com sucesso! Faça upload dos documentos para verificação.'
    };
  }

  async uploadDocumentoEscola(escolaId: number, usuarioId: number, file: Express.Multer.File, dto: any) {
    const administrador = await this.prisma.administradorEscola.findFirst({
      where: { usuarioId, escolaId }
    });

    if (!administrador) {
      throw new ForbiddenException('Não tem permissão para adicionar documentos a esta escola');
    }

    if (!['alvara', 'certificado_registro'].includes(dto.tipo)) {
      throw new BadRequestException('Tipo de documento inválido. Use: alvara ou certificado_registro');
    }

    // Verificar se o arquivo foi recebido
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const extensao = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(extensao)) {
      throw new BadRequestException('Formato de arquivo inválido. Use: PDF, JPG, JPEG ou PNG');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Arquivo muito grande. Máximo: 10MB');
    }

    // Criar diretório se não existir
    const uploadDir = join(process.cwd(), 'uploads', 'escolas', escolaId.toString());
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${dto.tipo}-${timestamp}-${randomString}${extname(file.originalname)}`;
    const filePath = join(uploadDir, fileName);

    try {
      // Salvar arquivo manualmente
      writeFileSync(filePath, file.buffer);
      
      console.log(`Arquivo salvo em: ${filePath}`); // Para debug

      const urlDocumento = `/uploads/escolas/${escolaId}/${fileName}`;

      const documento = await this.prisma.documentoEscola.create({
        data: {
          escolaId,
          tipo: dto.tipo,
          url: urlDocumento,
          nomeArquivo: file.originalname,
          numeroDocumento: dto.numeroDocumento,
          dataEmissao: dto.dataEmissao ? new Date(dto.dataEmissao) : null,
          dataValidade: dto.dataValidade ? new Date(dto.dataValidade) : null,
        }
      });

      return {
        documento,
        mensagem: 'Documento carregado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao salvar arquivo:', error);
      throw new BadRequestException('Erro ao salvar arquivo no servidor');
    }
  }

  async avaliarDocumento(documentoId: number, aprovado: boolean, observacoes?: string) {
    const documento = await this.prisma.documentoEscola.update({
      where: { id: documentoId },
      data: {
        aprovado,
        observacoes,
        aprovadoEm: new Date()
      },
      include: { escola: true }
    });

    return {
      documento,
      mensagem: aprovado ? 'Documento aprovado' : 'Documento rejeitado'
    };
  }

  // src/school/school.service.ts
async getEscolaDoAdministrador(usuarioId: number) {
  const administrador = await this.prisma.administradorEscola.findFirst({
    where: { 
      usuarioId 
    },
    include: {
      escola: {
        include: {
          documentosVerificacao: {
            select: {
              id: true,
              tipo: true,
              nomeArquivo: true,
              numeroDocumento: true,
              aprovado: true,
              observacoes: true,
              criadoEm: true,
              aprovadoEm: true
            }
          },
          administradores: {
            where: {
              usuarioId: usuarioId
            },
            select: {
              id: true,
              isVerificado: true,
              criadoEm: true
            }
          }
        }
      }
    }
  });

  if (!administrador) {
    throw new NotFoundException('Administrador escolar não encontrado');
  }

  // Extrair dados do administrador específico
  const adminData = administrador.escola.administradores.find(a => a.id === administrador.id);

  return {
    administrador: {
      id: administrador.id,
      isVerificado: administrador.isVerificado,
      criadoEm: administrador.criadoEm
    },
    escola: {
      id: administrador.escola.id,
      nome: administrador.escola.nome,
      codigo: administrador.escola.codigo,
      localizacao: administrador.escola.localizacao,
      emailInstitucional: administrador.escola.emailInstitucional,
      telefoneInstitucional: administrador.escola.telefoneInstitucional,
      isVerificada: administrador.escola.isVerificada,
      ativa: administrador.escola.ativa,
      criadoEm: administrador.escola.criadoEm,
      atualizadoEm: administrador.escola.atualizadoEm
    },
    documentos: administrador.escola.documentosVerificacao
  };
}


// src/school/school.service.ts
async atualizarEscola(usuarioId: number, dto: any) {
  // Verificar se o usuário é administrador de uma escola
  const administrador = await this.prisma.administradorEscola.findFirst({
    where: { 
      usuarioId,
      isVerificado: true // Só administradores verificados podem editar
    },
    include: {
      escola: true
    }
  });

  if (!administrador) {
    throw new ForbiddenException('Não tem permissão para editar esta escola');
  }

  // Validar dados
  if (dto.emailInstitucional) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.emailInstitucional)) {
      throw new BadRequestException('Email institucional inválido');
    }
  }

  // Atualizar a escola
  const escolaAtualizada = await this.prisma.escola.update({
    where: { id: administrador.escolaId },
    data: {
      nome: dto.nome,
      localizacao: dto.localizacao,
      emailInstitucional: dto.emailInstitucional,
      telefoneInstitucional: dto.telefoneInstitucional,
    }
  });

  return {
    escola: escolaAtualizada,
    mensagem: 'Informações da escola atualizadas com sucesso'
  };
}

// src/school/services/school.service.ts (adicionar estes métodos)

async listarProfessoresEscola(usuarioId: number) {
  const administrador = await this.prisma.administradorEscola.findFirst({
    where: { 
      usuarioId,
      isVerificado: true
    }
  });

  if (!administrador) {
    throw new ForbiddenException('Não tem permissão para ver professores desta escola');
  }

  const professores = await this.prisma.professor.findMany({
    where: {
      escolaId: administrador.escolaId,
      isVerificado: true
    },
    include: {
      usuario: {
        select: {
          id: true,
          nome: true,
          sobrenome: true,
          email: true,
          telefone: true
        }
      },
      disciplinas: {
        select: {
          id: true,
          nome: true
        }
      }
    },
    orderBy: {
      usuario: {
        nome: 'asc'
      }
    }
  });

  return {
    professores,
    total: professores.length
  };
}

async getProfessorDetalhes(professorId: number, usuarioId: number) {
  const administrador = await this.prisma.administradorEscola.findFirst({
    where: { 
      usuarioId,
      isVerificado: true
    }
  });

  if (!administrador) {
    throw new ForbiddenException('Não tem permissão para ver detalhes deste professor');
  }

  const professor = await this.prisma.professor.findFirst({
    where: {
      id: professorId,
      escolaId: administrador.escolaId
    },
    include: {
      usuario: {
        select: {
          id: true,
          nome: true,
          sobrenome: true,
          email: true,
          telefone: true,
        }
      },
      disciplinas: {
        select: {
          id: true,
          nome: true
        }
      },
      // alunos: {
      //   include: {
      //     aluno: {
      //       select: {
      //         id: true,
      //         nome: true,
      //         sobrenome: true,
      //         classe: true
      //       }
      //     }
      //   }
      // }
    }
  });

  if (!professor) {
    throw new NotFoundException('Professor não encontrado');
  }

  return { professor };
}
}