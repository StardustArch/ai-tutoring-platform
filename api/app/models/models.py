"""
O Modelo de Dados V2.1 (KaniMente)

Incorpora:
- Funções Dinâmicas (Perfis de Usuário)
- OAuth (na tabela Usuario)
- Relações M-N (Professor <-> Aluno, Professor <-> Disciplina)
- O "Ponto de Partida" (Aluno.classe)
- O "Nível Real" (AlunoProficienciaTopico)
- Mensagens "Enriquecidas" (ChatMensagem.tipo_interacao)
"""
import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Enum, Date, DateTime, Boolean, 
    Text, ForeignKey, Table, JSON
)
from sqlalchemy.orm import relationship
from app.models.database import Base  # (Vamos criar este ficheiro 'database.py' a seguir)

# --- 1. O NÚCLEO: Login e Perfis ---

class Usuario(Base):
    """
    O LOGIN. Contém apenas os dados de autenticação.
    Pode ser manual (password) ou OAuth (Google).
    """
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nome_completo = Column(String)
    password_hash = Column(String, nullable=True) 
    oauth_provider = Column(String, nullable=True) 
    oauth_id = Column(String, nullable=True, unique=True) 

    perfil_professor = relationship("Professor", back_populates="usuario", uselist=False)
    perfil_encarregado = relationship("Encarregado", back_populates="usuario", uselist=False)

class Professor(Base):
    """ O PERFIL do Professor. """
    __tablename__ = "professores"
    id = Column(Integer, primary_key=True, index=True)
    escola = Column(String)
    
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)
    usuario = relationship("Usuario", back_populates="perfil_professor")

    disciplinas = relationship("Disciplina", secondary="professor_disciplina_link", back_populates="professores")
    alunos = relationship("Aluno", secondary="professor_aluno_link", back_populates="professores")

class Encarregado(Base):
    """ O PERFIL do Encarregado. """
    __tablename__ = "encarregados"
    id = Column(Integer, primary_key=True, index=True)
    telefone = Column(String, nullable=True)
    
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)
    usuario = relationship("Usuario", back_populates="perfil_encarregado")
    
    alunos = relationship("Aluno", back_populates="encarregado")

class Aluno(Base):
    """ O PERFIL do Aluno. """
    __tablename__ = "alunos"
    id = Column(Integer, primary_key=True, index=True)
    nome_aluno = Column(String, nullable=False)
    data_nascimento = Column(Date, nullable=True)
    
    # NOVO: O "Ponto de Partida" (Nível esperado)
    classe = Column(Integer, nullable=False) # Ex: 3 (para 3ª classe)
    
    encarregado_id = Column(Integer, ForeignKey("encarregados.id"), nullable=False)
    encarregado = relationship("Encarregado", back_populates="alunos")
    
    professores = relationship("Professor", secondary="professor_aluno_link", back_populates="alunos")

# --- 2. O CONTEÚDO: Disciplinas e Tópicos ---

class Disciplina(Base):
    __tablename__ = "disciplinas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, nullable=False) # "matematica", "portugues"
    
    professores = relationship("Professor", secondary="professor_disciplina_link", back_populates="disciplinas")
    topicos = relationship("Topico", back_populates="disciplina")

class Topico(Base):
    """As "etiquetas" que vamos medir (Soma, Verbos, etc.)"""
    __tablename__ = "topicos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False) # Ex: "Soma Simples"
    nivel_classe = Column(Integer) # Ex: 3 (para 3ª classe)
    
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id"), nullable=False)
    disciplina = relationship("Disciplina", back_populates="topicos")

# --- 3. AS TABELAS DE ASSOCIAÇÃO (Muitos-para-Muitos) ---

ProfessorDisciplinaLink = Table(
    "professor_disciplina_link", Base.metadata,
    Column("professor_id", ForeignKey("professores.id"), primary_key=True),
    Column("disciplina_id", ForeignKey("disciplinas.id"), primary_key=True)
)

ProfessorAlunoLink = Table(
    "professor_aluno_link", Base.metadata,
    Column("professor_id", ForeignKey("professores.id"), primary_key=True),
    Column("aluno_id", ForeignKey("alunos.id"), primary_key=True)
)

# --- 4. OS RESULTADOS (O Dashboard) ---

class TipoInteracaoChat(str, enum.Enum):
    explicacao = "explicacao"
    exercicio = "exercicio"
    saudacao = "saudacao"
    desconhecido = "desconhecido"

class ChatMensagem(Base):
    """Guarda o histórico da conversa do chatbot."""
    __tablename__ = "chat_mensagens"
    id = Column(Integer, primary_key=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    mensagem_aluno = Column(Text)
    resposta_ia = Column(Text)
    
    # NOVO: "Enriquecimento" da mensagem
    tipo_interacao = Column(Enum(TipoInteracaoChat), default="desconhecido")
    
    topico_id = Column(Integer, ForeignKey("topicos.id"), nullable=True) 

class ExercicioResultado(Base):
    """Guarda o resultado de um exercício específico."""
    __tablename__ = "exercicio_resultados"
    id = Column(Integer, primary_key=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"), nullable=False)
    topico_id = Column(Integer, ForeignKey("topicos.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    acertou = Column(Boolean, nullable=False)
    detalhes_json = Column(JSON, nullable=True)

class NivelProficiencia(str, enum.Enum):
    iniciante = "iniciante"
    abaixo_media = "abaixo_media"
    na_media = "na_media"
    avancado = "avancado"
    nao_diagnosticado = "nao_diagnosticado"

class AlunoProficienciaTopico(Base):
    """
    NOVO: Guarda o NÍVEL ACTUAL (diagnosticado) de um aluno num tópico.
    Este é o "cérebro" da adaptação e do dashboard.
    """
    __tablename__ = "aluno_proficiencia_topico"
    
    id = Column(Integer, primary_key=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"), nullable=False)
    topico_id = Column(Integer, ForeignKey("topicos.id"), nullable=False)
    
    nivel = Column(Enum(NivelProficiencia), default="nao_diagnosticado")
    
    aluno = relationship("Aluno")
    topico = relationship("Topico")