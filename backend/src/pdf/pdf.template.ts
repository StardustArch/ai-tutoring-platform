// Template HTML para o PDF do relatório do professor
// Usar com: await this.studentService.getStudentReportForTeacherV2(...)

export function buildPdfHtml(report: any, timeRange: string): string {
  const BLUE = '#3b82f6';
  const BLUE_LIGHT = '#eff6ff';
  const BLUE_DARK = '#1d4ed8';
  const GRAY_900 = '#111827';
  const GRAY_700 = '#374151';
  const GRAY_500 = '#6b7280';
  const GRAY_400 = '#9ca3af';
  const GRAY_200 = '#e5e7eb';
  const GRAY_100 = '#f3f4f6';
  const RED = '#ef4444';
  const RED_LIGHT = '#fef2f2';
  const GREEN = '#10b981';
  const GREEN_LIGHT = '#f0fdf4';
  const AMBER = '#f59e0b';
  const AMBER_LIGHT = '#fffbeb';
  const WHITE = '#ffffff';

  const periodoLabel: Record<string, string> = {
    all: 'Todo o período', '30d': 'Últimos 30 dias', '7d': 'Últimos 7 dias'
  };

  const scoreColor = (v: number) => v >= 80 ? GREEN : v >= 50 ? AMBER : RED;
  const scoreTextColor = (v: number) => v >= 80 ? '#065f46' : v >= 50 ? '#92400e' : '#991b1b';
  const scoreBg = (v: number) => v >= 80 ? GREEN_LIGHT : v >= 50 ? AMBER_LIGHT : RED_LIGHT;
  const barColor = (v: number) => v >= 80 ? GREEN : v >= 50 ? AMBER : RED;

  const formatDate = (d: any) => new Date(d).toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  const formatDur = (s: number | null) => {
    if (!s) return '—';
    if (s < 60) return `${s}s`;
    return `${Math.round(s / 60)}min`;
  };

  const modoLabel: Record<string, string> = {
    RUSH: 'Rush', TUTOR: 'Tutor', LESSON: 'Lição'
  };

  const modoColor: Record<string, string> = {
    RUSH: AMBER, TUTOR: BLUE, LESSON: GREEN
  };

  const statusLabel: Record<string, string> = {
    CONCLUIDA: 'Concluída', ABANDONADA: 'Abandonada', EM_ANDAMENTO: 'Em curso'
  };

  const statusColor: Record<string, string> = {
    CONCLUIDA: GREEN, ABANDONADA: RED, EM_ANDAMENTO: AMBER
  };

  const nivelLabel: Record<string, string> = {
    ALTO: 'Alto', MEDIO: 'Médio', BAIXO: 'Baixo'
  };

  const taxa = report.stats?.taxaGlobal ?? 0;
  const aluno = report.aluno;
  const resumo = report.resumo;
  const disciplinas: any[] = report.disciplinas ?? [];
  const atencao: any[] = report.atencaoNecessaria ?? [];
  const historico: any[] = (report.historicoRecente ?? []).slice(0, 6);
  const insights: string[] = report.insights ?? [];
  const recomendacoes: string[] = report.recomendacoes ?? [];
  const trilha: any[] = (report.trilhaAuditoria ?? []).slice(0, 2);
  const sessoes: any[] = (report.sessoesRecentes ?? []).slice(0, 5);
  const risco = report.risco;
  const engajamento = report.engajamento;
  const proficiencia = report.proficiencia;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório — ${aluno.nome} ${aluno.sobrenome}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'DM Sans', sans-serif;
    color: ${GRAY_900};
    background: ${WHITE};
    font-size: 13px;
    line-height: 1.5;
  }

  .page {
    width: 210mm;
    padding: 14mm 16mm;
  }

  /* ── HEADER ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 12px;
    border-bottom: 2px solid ${GRAY_900};
    margin-bottom: 20px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .brand-dot {
    width: 28px; height: 28px;
    background: ${BLUE};
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 700; font-size: 14px;
  }

  .brand-name {
    font-size: 18px;
    font-weight: 700;
    color: ${GRAY_900};
    letter-spacing: -0.5px;
  }

  .header-meta {
    text-align: right;
  }

  .header-meta .doc-title {
    font-size: 11px;
    font-weight: 600;
    color: ${GRAY_500};
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .header-meta .doc-date {
    font-size: 12px;
    font-weight: 500;
    color: ${GRAY_700};
    margin-top: 2px;
  }

  /* ── STUDENT CARD ── */
  .student-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid ${GRAY_200};
    border-radius: 10px;
    margin-bottom: 16px;
    background: ${GRAY_100};
  }

  .avatar {
    width: 52px; height: 52px;
    background: ${BLUE};
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 20px; font-weight: 700;
    flex-shrink: 0;
  }

  .student-info { flex: 1; }

  .student-name {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: ${GRAY_900};
  }

  .student-meta {
    font-size: 11px;
    color: ${GRAY_500};
    font-weight: 500;
    margin-top: 2px;
  }

  .score-block {
    text-align: right;
  }

  .score-big {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -1px;
    line-height: 1;
  }

  .score-label {
    font-size: 10px;
    font-weight: 600;
    color: ${GRAY_500};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 3px;
  }

  /* ── METRICS ROW ── */
  .metrics-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }

  .metric-box {
    border: 1px solid ${GRAY_200};
    border-radius: 8px;
    padding: 12px;
    text-align: center;
  }

  .metric-value {
    font-size: 22px;
    font-weight: 700;
    color: ${GRAY_900};
    letter-spacing: -0.5px;
  }

  .metric-label {
    font-size: 10px;
    font-weight: 600;
    color: ${GRAY_400};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 3px;
  }

  /* ── SECTION TITLE ── */
  .section-title {
    font-size: 10px;
    font-weight: 700;
    color: ${GRAY_500};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${GRAY_200};
  }

  /* ── TWO COLUMN LAYOUT ── */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  .three-col {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  /* ── DISCIPLINES ── */
  .disc-item {
    margin-bottom: 10px;
  }

  .disc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .disc-name {
    font-size: 12px;
    font-weight: 600;
    color: ${GRAY_700};
  }

  .disc-score {
    font-size: 12px;
    font-weight: 700;
    font-family: 'DM Mono', monospace;
  }

  .bar-track {
    height: 5px;
    background: ${GRAY_200};
    border-radius: 3px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 3px;
  }

  /* ── PILL TAGS ── */
  .pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 600;
  }

  /* ── INSIGHT / RECOMENDACAO LIST ── */
  .list-card {
    border: 1px solid ${GRAY_200};
    border-radius: 8px;
    padding: 12px 14px;
  }

  .list-item {
    font-size: 11px;
    color: ${GRAY_700};
    padding: 5px 0;
    border-bottom: 1px solid ${GRAY_100};
    line-height: 1.4;
    display: flex;
    gap: 6px;
  }

  .list-item:last-child { border-bottom: none; }

  .list-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    margin-top: 5px;
    flex-shrink: 0;
  }

  /* ── CRITICAL TOPICS ── */
  .critical-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .critical-item {
    border: 1px solid #fecaca;
    border-radius: 7px;
    padding: 10px 12px;
    background: ${RED_LIGHT};
  }

  .critical-topic {
    font-size: 12px;
    font-weight: 600;
    color: #991b1b;
  }

  .critical-disc {
    font-size: 10px;
    color: #b91c1c;
    margin-top: 2px;
    font-weight: 500;
  }

  /* ── PROFICIENCY ── */
  .prof-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .prof-box {
    border: 1px solid ${GRAY_200};
    border-radius: 7px;
    padding: 10px;
    text-align: center;
  }

  .prof-num {
    font-size: 22px;
    font-weight: 700;
    color: ${GRAY_900};
  }

  .prof-label {
    font-size: 9px;
    font-weight: 600;
    color: ${GRAY_400};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 2px;
  }

  /* ── SESSOES TABLE ── */
  .sess-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  .sess-table th {
    text-align: left;
    font-size: 9px;
    font-weight: 700;
    color: ${GRAY_400};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 8px 6px 0;
    border-bottom: 1px solid ${GRAY_200};
  }

  .sess-table td {
    padding: 7px 8px 7px 0;
    border-bottom: 1px solid ${GRAY_100};
    vertical-align: middle;
  }

  .sess-table tr:last-child td { border-bottom: none; }

  .modo-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 600;
    color: white;
  }

  /* ── AUDITORIA ── */
  .audit-item {
    border: 1px solid ${GRAY_200};
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 10px;
  }

  .audit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: ${GRAY_100};
    border-bottom: 1px solid ${GRAY_200};
  }

  .audit-topico {
    font-size: 11px;
    font-weight: 700;
    color: ${GRAY_900};
  }

  .audit-body {
    padding: 10px 12px;
  }

  .chat-line {
    display: flex;
    gap: 8px;
    margin-bottom: 7px;
  }

  .chat-line:last-child { margin-bottom: 0; }

  .chat-actor {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    width: 30px;
    flex-shrink: 0;
    padding-top: 2px;
  }

  .chat-msg {
    font-size: 11px;
    color: ${GRAY_700};
    line-height: 1.4;
    flex: 1;
  }

  .assessment-badge {
    display: inline-block;
    margin-left: 6px;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
  }

  /* ── HISTORY TIMELINE ── */
  .hist-item {
    display: flex;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px solid ${GRAY_100};
  }

  .hist-item:last-child { border-bottom: none; }

  .hist-dot-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 4px;
  }

  .hist-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .hist-line {
    width: 1px;
    flex: 1;
    background: ${GRAY_200};
    margin-top: 3px;
  }

  .hist-content { flex: 1; }

  .hist-topico {
    font-size: 11px;
    font-weight: 600;
    color: ${GRAY_900};
  }

  .hist-meta {
    font-size: 10px;
    color: ${GRAY_400};
    margin-top: 1px;
  }

  /* ── RISCO ── */
  .risco-card {
    border-radius: 8px;
    padding: 12px 14px;
    border: 1px solid;
  }

  .risco-factors {
    margin-top: 8px;
  }

  .risco-factor {
    font-size: 10px;
    color: ${GRAY_700};
    padding: 2px 0;
    display: flex;
    gap: 5px;
    align-items: flex-start;
  }

  /* ── FOOTER ── */
  .footer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid ${GRAY_200};
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-brand {
    font-size: 11px;
    font-weight: 600;
    color: ${GRAY_400};
  }

  .footer-note {
    font-size: 10px;
    color: ${GRAY_400};
  }

  .divider {
    height: 1px;
    background: ${GRAY_200};
    margin: 18px 0;
  }

  .page-break {
    page-break-before: always;
    padding-top: 14mm;
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="brand">
      <div class="brand-dot">K</div>
      <span class="brand-name">KMind</span>
    </div>
    <div class="header-meta">
      <div class="doc-title">Relatório Pedagógico Individual · ${periodoLabel[timeRange] ?? timeRange}</div>
      <div class="doc-date">${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>

  <!-- STUDENT CARD -->
  <div class="student-card">
    <div class="avatar">${aluno.nome[0]}${aluno.sobrenome[0]}</div>
    <div class="student-info">
      <div class="student-name">${aluno.nome} ${aluno.sobrenome}</div>
      <div class="student-meta">${aluno.classe}ª Classe &nbsp;·&nbsp; ${aluno.xp} XP</div>
      ${risco ? `<div style="margin-top:5px;">
        <span class="pill" style="background:${risco.nivel === 'ALTO' ? RED_LIGHT : risco.nivel === 'MEDIO' ? AMBER_LIGHT : GREEN_LIGHT}; color:${scoreTextColor(risco.nivel === 'ALTO' ? 0 : risco.nivel === 'MEDIO' ? 60 : 90)}">
          Risco ${nivelLabel[risco.nivel] ?? risco.nivel}
        </span>
      </div>` : ''}
    </div>
    <div class="score-block">
      <div class="score-big" style="color:${scoreColor(taxa)}">${taxa}%</div>
      <div class="score-label">Média global</div>
    </div>
  </div>

  <!-- METRICS -->
  <div class="metrics-row">
    <div class="metric-box">
      <div class="metric-value">${report.stats?.totalInteracoes ?? 0}</div>
      <div class="metric-label">Actividades</div>
    </div>
    <div class="metric-box">
      <div class="metric-value">${engajamento ? Math.round(engajamento.tempoTotalSegundos / 60) : 0}m</div>
      <div class="metric-label">Tempo estudo</div>
    </div>
    <div class="metric-box">
      <div class="metric-value">${engajamento?.sessoesConcluidas ?? 0}<span style="font-size:13px;color:${GRAY_400}">/${(engajamento?.sessoesConcluidas ?? 0) + (engajamento?.sessoesAbandonadas ?? 0)}</span></div>
      <div class="metric-label">Sessões concluídas</div>
    </div>
    <div class="metric-box">
      <div class="metric-value">${report.stats?.rush?.acertos ?? 0}<span style="font-size:13px;color:${GRAY_400}">+${report.stats?.tutor?.acertos ?? 0}</span></div>
      <div class="metric-label">Acertos Rush+Tutor</div>
    </div>
  </div>

  <!-- DISCIPLINAS + INSIGHTS/RECOMENDAÇÕES -->
  <div class="three-col">

    <!-- Disciplinas -->
    <div>
      <div class="section-title">Desempenho por disciplina</div>
      ${disciplinas.length > 0 ? disciplinas.map(d => `
        <div class="disc-item">
          <div class="disc-header">
            <span class="disc-name">${d.disciplina}</span>
            <span class="disc-score" style="color:${scoreColor(d.taxa)}">${d.taxa}%</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${d.taxa}%;background:${barColor(d.taxa)}"></div>
          </div>
        </div>
      `).join('') : `<p style="font-size:11px;color:${GRAY_400}">Sem dados de disciplina.</p>`}
    </div>

    <!-- Insights -->
    <div>
      <div class="section-title">Insights</div>
      ${insights.length > 0 ? `
        <div class="list-card">
          ${insights.map(i => `
            <div class="list-item">
              <div class="list-dot" style="background:${BLUE}"></div>
              <span>${i}</span>
            </div>
          `).join('')}
        </div>
      ` : `<p style="font-size:11px;color:${GRAY_400}">Sem insights.</p>`}
    </div>

    <!-- Recomendações -->
    <div>
      <div class="section-title">Recomendações</div>
      ${recomendacoes.length > 0 ? `
        <div class="list-card">
          ${recomendacoes.map(r => `
            <div class="list-item">
              <div class="list-dot" style="background:${AMBER}"></div>
              <span>${r}</span>
            </div>
          `).join('')}
        </div>
      ` : `<p style="font-size:11px;color:${GRAY_400}">Sem recomendações.</p>`}
    </div>
  </div>

  <!-- TÓPICOS CRÍTICOS + PROFICIÊNCIA -->
  ${atencao.length > 0 ? `
    <div class="divider"></div>
    <div class="section-title">Tópicos críticos</div>
    <div class="critical-grid" style="margin-bottom:18px">
      ${atencao.map(a => `
        <div class="critical-item">
          <div class="critical-topic">${a.topico}</div>
          <div class="critical-disc">${a.disciplina}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${proficiencia ? `
    <div class="divider"></div>
    <div class="section-title">Proficiência por nível</div>
    <div class="prof-grid" style="margin-bottom:18px">
      <div class="prof-box">
        <div class="prof-num" style="color:${RED}">${proficiencia.INICIANTE ?? 0}</div>
        <div class="prof-label">Iniciante</div>
      </div>
      <div class="prof-box">
        <div class="prof-num" style="color:${AMBER}">${proficiencia.ABAIXO_MEDIA ?? 0}</div>
        <div class="prof-label">Abaixo média</div>
      </div>
      <div class="prof-box">
        <div class="prof-num" style="color:${BLUE}">${proficiencia.NA_MEDIA ?? 0}</div>
        <div class="prof-label">Na média</div>
      </div>
      <div class="prof-box">
        <div class="prof-num" style="color:${GREEN}">${proficiencia.AVANCADO ?? 0}</div>
        <div class="prof-label">Avançado</div>
      </div>
    </div>
  ` : ''}

  <!-- SESSÕES RECENTES -->
  ${sessoes.length > 0 ? `
    <div class="divider"></div>
    <div class="section-title">Sessões recentes</div>
    <table class="sess-table" style="margin-bottom:18px">
      <thead>
        <tr>
          <th>Modo</th>
          <th>Data</th>
          <th>Estado</th>
          <th style="text-align:right">Acertos</th>
          <th style="text-align:right">Duração</th>
        </tr>
      </thead>
      <tbody>
        ${sessoes.map(s => `
          <tr>
            <td>
              <span class="modo-pill" style="background:${modoColor[s.modo] ?? GRAY_500}">
                ${modoLabel[s.modo] ?? s.modo}
              </span>
            </td>
            <td style="color:${GRAY_500}; font-size:10px">${formatDate(s.inicio)}</td>
            <td>
              <span style="font-size:10px;font-weight:600;color:${statusColor[s.status] ?? GRAY_500}">
                ${statusLabel[s.status] ?? s.status}
              </span>
            </td>
            <td style="text-align:right;font-family:'DM Mono',monospace;font-size:11px">
              <span style="color:${GREEN}">${s.acertos}</span>/<span style="color:${RED}">${s.erros}</span>
            </td>
            <td style="text-align:right;color:${GRAY_500};font-size:10px">${formatDur(s.duracaoSegundos)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <!-- PÁGINA 2: AUDITORIA + HISTÓRICO -->
  ${(trilha.length > 0 || historico.length > 0) ? `
    <div class="page-break">

      <!-- HEADER repetido -->
      <div class="header">
        <div class="brand">
          <div class="brand-dot">K</div>
          <span class="brand-name">KMind</span>
        </div>
        <div class="header-meta">
          <div class="doc-title">Relatório · ${aluno.nome} ${aluno.sobrenome} · Pág. 2</div>
          <div class="doc-date">${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      ${trilha.length > 0 ? `
        <div class="section-title" style="margin-bottom:12px">Auditoria de didática da IA</div>
        <p style="font-size:11px;color:${GRAY_500};margin-bottom:14px">Avalie se as respostas da IA foram pedagógicamente adequadas para o nível do aluno.</p>

        ${trilha.map(t => `
          <div class="audit-item">
            <div class="audit-header">
              <span class="audit-topico">${t.topico}</span>
              <div style="display:flex;gap:8px;align-items:center">
                <span class="pill" style="background:${t.statusDidatico === 'ALERTA' ? RED_LIGHT : t.statusDidatico === 'EXCELENTE' ? GREEN_LIGHT : GRAY_100}; color:${t.statusDidatico === 'ALERTA' ? '#991b1b' : t.statusDidatico === 'EXCELENTE' ? '#065f46' : GRAY_500}">
                  ${t.statusDidatico}
                </span>
                <span style="font-size:10px;color:${GRAY_400}">${formatDate(t.dataUltimaInteracao)}</span>
              </div>
            </div>
            <div class="audit-body">
              ${(t.interacoes ?? []).map((msg: any) => `
                <div class="chat-line">
                  <span class="chat-actor" style="color:${msg.ator === 'IA' ? BLUE : GRAY_500}">${msg.ator}</span>
                  <span class="chat-msg">
                    ${msg.mensagem}
                    ${msg.assessment ? `<span class="assessment-badge" style="background:${msg.assessment === 'CORRECT' ? GREEN_LIGHT : RED_LIGHT};color:${msg.assessment === 'CORRECT' ? '#065f46' : '#991b1b'}">${msg.assessment}</span>` : ''}
                  </span>
                </div>
              `).join('')}
              <div style="margin-top:8px;padding-top:8px;border-top:1px solid ${GRAY_100}">
                <span style="font-size:10px;font-style:italic;color:${GRAY_500}">${t.resumoProblema}</span>
              </div>
            </div>
          </div>
        `).join('')}
      ` : ''}

      ${historico.length > 0 ? `
        <div class="divider"></div>
        <div class="section-title">Actividade recente</div>
        <div style="border:1px solid ${GRAY_200};border-radius:8px;padding:12px 14px">
          ${historico.map((log: any, i: number) => `
            <div class="hist-item">
              <div class="hist-dot-col">
                <div class="hist-dot" style="background:${log.acertou === true ? GREEN : log.acertou === false ? RED : GRAY_400}"></div>
                ${i < historico.length - 1 ? `<div class="hist-line"></div>` : ''}
              </div>
              <div class="hist-content">
                <div class="hist-topico">${log.topico}</div>
                <div class="hist-meta">
                  ${formatDate(log.data)} &nbsp;·&nbsp;
                  <span style="color:${BLUE};font-weight:600">${log.tipo}</span>
                  ${log.pergunta ? `&nbsp;·&nbsp; "${log.pergunta.length > 60 ? log.pergunta.substring(0, 60) + '…' : log.pergunta}"` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

    </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <span class="footer-brand">KMind · Relatório gerado automaticamente</span>
    <span class="footer-note">${new Date().getFullYear()} · Documento pedagógico confidencial</span>
  </div>

</div>
</body>
</html>`;
}