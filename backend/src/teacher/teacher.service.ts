import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeacherService {
constructor(private prisma: PrismaService) {}

async getProfessorStats(professorId: number) {
  // 1. Descobrir a disciplina do Professor
  // (Assumindo que o Professor está ligado a disciplinas ou turmas específicas)
  const turmasProfessor = await this.prisma.turma.findMany({
      where: { professorId },
      select: { id: true, disciplinaId: true }
  });

  const disciplinaIds = turmasProfessor.map(t => t.disciplinaId);

  // 2. Buscar mensagens APENAS dessas disciplinas
  const stats = await this.prisma.chatMensagem.groupBy({
      by: ['topicoId'],
      where: {
          topico: {
              disciplinaId: { in: disciplinaIds } // <--- O FILTRO MÁGICO
          },
          // Opcional: filtrar apenas pelos alunos das turmas dele
          aluno: {
              alunoTurmas: {
                  some: { turmaId: { in: turmasProfessor.map(t => t.id) } }
              }
          }
      },
      _count: { id: true }
  });

  return stats;
}

async getDashboardOverview(usuarioId: number) {
    // 1. Achar o perfil de Professor ligado a este Usuario
    const professor = await this.prisma.professor.findUnique({
      where: { usuarioId },
      include: {
        usuario: true, // <--- 🔴 IMPORTANTE: Trazer os dados do Usuário (Nome, Email)
        _count: {
          select: { turmas: true } 
        }
      }
    });

    if (!professor) {
      return { erro: 'Perfil de professor não encontrado' };
    }

    // 2. Contar total de alunos
    const totalAlunos = await this.prisma.alunoTurma.count({
      where: {
        turma: {
          professorId: professor.id
        }
      }
    });

    // 3. Verificar se é encarregado
    const encarregado = await this.prisma.encarregado.findUnique({
      where: { usuarioId }
    });

    return {
      // 🔴 CORREÇÃO: Pegamos o nome do objeto 'usuario' aninhado, não do professor
      nome: professor.usuario.nome, 
      sobrenome: professor.usuario.sobrenome,
      totalTurmas: professor._count.turmas,
      totalAlunos: totalAlunos,
      isEncarregado: !!encarregado,
      escolaNome: professor.escolaNome || null
    };
  }

  private getDemoOverview() {
  return [
    {
      id: -1,
      nome: 'Turma Demo ⚡',
      disciplina: 'Demonstração',
      totalAlunos: 2,
      mediaTurma: 68,
      alunos: [
        {
          id: -101,
          nome: 'Ana',
          taxa: 85,
          totalAtividades: 15,
          status: 'good',
          turmaId: -1,
          turmaNome: 'Turma Demo ⚡',
          isDemo: true
        },
        {
          id: -102,
          nome: 'Carlos',
          taxa: 52,
          totalAtividades: 12,
          status: 'warning',
          turmaId: -1,
          turmaNome: 'Turma Demo ⚡',
          isDemo: true
        }
      ]
    }
  ];
}

  async getReportsOverview(usuarioId: number) {
    // 1. Identificar o Professor
    const professor = await this.prisma.professor.findUnique({
      where: { usuarioId },
      select: { id: true }
    });

    if (!professor) return [];

    // 2. Buscar Turmas com Alunos e suas atividades (Nível Turma)
    const turmas = await this.prisma.turma.findMany({
      where: { professorId: professor.id, ativa: true },
      include: {
        disciplina: { select: { nome: true } },
        alunos: {
          include: {
            aluno: {
              select: { id: true, nome: true, sobrenome: true }
            }
          }
        }
      }
    });

    // 3. Processar cada turma para gerar métricas
    const relatorioConsolidado = await Promise.all(turmas.map(async (turma) => {
      
      // Vamos processar os alunos desta turma
      const alunosStats = await Promise.all(turma.alunos.map(async (matricula) => {
        const alunoId = matricula.alunoId;

        // A. Rush (Exercícios Práticos) NAQUELA TURMA
        const rushTotal = await this.prisma.exercicioResultado.count({
          where: { alunoId, turmaId: turma.id }
        });
        const rushAcertos = await this.prisma.exercicioResultado.count({
          where: { alunoId, turmaId: turma.id, acertou: true }
        });

        // B. Tutor (Chat) NAQUELA TURMA (Simplificado)
        // Nota: Idealmente filtraríamos por 'CORRECT' na string JSON, mas para performance aqui usamos contagem simples
        // Se quiseres precisão absoluta, usa a mesma lógica do getGuardianReport
        const tutorTotal = await this.prisma.chatMensagem.count({
            where: { alunoId, turmaId: turma.id, respostaIa: { contains: '"assessment":' } }
        });
        const tutorAcertos = await this.prisma.chatMensagem.count({
            where: { alunoId, turmaId: turma.id, respostaIa: { contains: '"assessment": "CORRECT"' } }
        });

        const totalTentativas = rushTotal + tutorTotal;
        const totalAcertos = rushAcertos + tutorAcertos;
        const taxa = totalTentativas > 0 ? Math.round((totalAcertos / totalTentativas) * 100) : 0;

        // C. Definir Status
        let status = 'good';
        if (totalTentativas < 5) status = 'neutral'; // Pouca atividade para julgar
        else if (taxa < 50) status = 'danger';
        else if (taxa < 70) status = 'warning';

        return {
          id: matricula.aluno.id,
          nome: `${matricula.aluno.nome} ${matricula.aluno.sobrenome}`,
          taxa,
          totalAtividades: totalTentativas,
          status,
          turmaId: turma.id,
          turmaNome: turma.nome
        };
      }));

      // 4. Calcular Média da Turma
      const somaTaxas = alunosStats.reduce((acc, curr) => acc + curr.taxa, 0);
      const mediaTurma = alunosStats.length > 0 ? Math.round(somaTaxas / alunosStats.length) : 0;

      // Ordenar alunos: Piores notas primeiro (para o professor ver quem precisa de ajuda)
      alunosStats.sort((a, b) => a.taxa - b.taxa);

      return {
        id: turma.id,
        nome: turma.nome,
        disciplina: turma.disciplina.nome,
        totalAlunos: alunosStats.length,
        mediaTurma,
        alunos: alunosStats
      };
    }));

 const totalAlunos = relatorioConsolidado.flatMap(t => t.alunos).length;

if (totalAlunos === 0) {
  return this.getDemoOverview();
}

return relatorioConsolidado;
  }
}
