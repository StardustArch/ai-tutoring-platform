<svelte:head>
    <title>Política de Privacidade | KMind</title>
</svelte:head>

<script lang="ts">
  import { Lock, Eye, Database, Share2, Baby, FileText, Server } from 'lucide-svelte';
  
  const lastUpdated = "20 de Fevereiro de 2026";
</script>

<div class="min-h-screen bg-white dark:bg-surface-950 transition-colors duration-300">
  
  <div class="bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 py-16 px-4">
    <div class="max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-800 text-surface-900 dark:text-white mb-6">
        <Lock size={24} />
      </div>
      <h1 class="text-4xl md:text-5xl font-black text-surface-900 dark:text-white tracking-tight mb-4">
        Política de Privacidade
      </h1>
      <p class="text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
        O seu direito à privacidade é a nossa prioridade. Saiba como protegemos os dados da sua família.
      </p>
      <p class="text-sm text-surface-500 mt-6 font-mono">
        Última atualização: {lastUpdated}
      </p>
    </div>
  </div>

  <div class="max-w-3xl mx-auto px-4 py-16 space-y-12">
    
    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <Database class="text-primary-500" size={24} /> 1. Dados que Coletamos
      </h2>
      <p class="text-surface-600 dark:text-surface-300 leading-relaxed mb-4">
        Para fornecer a melhor experiência educativa, coletamos os seguintes tipos de informação:
      </p>
      <ul class="space-y-4">
        <li class="flex gap-3">
            <div class="mt-1 min-w-[20px]"><FileText size={18} class="text-surface-400"/></div>
            <div>
                <strong class="text-surface-900 dark:text-white">Dados de Conta:</strong> Nome, email, telefone (para encarregados) e senha encriptada.
            </div>
        </li>
        <li class="flex gap-3">
            <div class="mt-1 min-w-[20px]"><Baby size={18} class="text-surface-400"/></div>
            <div>
                <strong class="text-surface-900 dark:text-white">Dados do Educando:</strong> Nome, data de nascimento (para adequação de conteúdo) e nível escolar.
            </div>
        </li>
        <li class="flex gap-3">
            <div class="mt-1 min-w-[20px]"><Server size={18} class="text-surface-400"/></div>
            <div>
                <strong class="text-surface-900 dark:text-white">Dados de Uso:</strong> Progresso nas disciplinas, interações com o tutor IA, pontuações e tempos de resposta.
            </div>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <Eye class="text-primary-500" size={24} /> 2. Como Usamos os Dados
      </h2>
      <div class="bg-surface-50 dark:bg-surface-900 rounded-xl p-6 border border-surface-200 dark:border-surface-800">
        <p class="text-surface-600 dark:text-surface-300 leading-relaxed mb-4">
            Utilizamos as informações estritamente para fins pedagógicos e operacionais:
        </p>
        <ul class="list-disc pl-5 space-y-2 text-surface-600 dark:text-surface-300 text-sm">
            <li>Personalizar o nível de dificuldade dos exercícios.</li>
            <li>Gerar relatórios de progresso para encarregados e professores.</li>
            <li>Melhorar a precisão do nosso modelo de Inteligência Artificial.</li>
            <li>Comunicar atualizações importantes sobre o serviço.</li>
        </ul>
      </div>
    </section>

    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <Share2 class="text-primary-500" size={24} /> 3. Partilha de Dados
      </h2>
      <p class="text-surface-600 dark:text-surface-300 leading-relaxed">
        <strong>Não vendemos os seus dados a terceiros.</strong> Partilhamos informações apenas quando estritamente necessário para:
      </p>
      <ul class="list-disc pl-5 mt-4 space-y-2 text-surface-600 dark:text-surface-300">
        <li><strong>Provedores de IA:</strong> As interações de chat são processadas por provedores seguros (ex: OpenAI/Google), mas são anonimizadas sempre que possível.</li>
        <li><strong>Obrigação Legal:</strong> Cumprimento de leis ou requisições judiciais em Moçambique.</li>
      </ul>
    </section>

    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <Baby class="text-primary-500" size={24} /> 4. Privacidade Infantil
      </h2>
      <p class="text-surface-600 dark:text-surface-300 leading-relaxed">
        O KMind foi desenhado para ser usado por crianças, mas a conta deve ser sempre gerida por um responsável legal. Não recolhemos intencionalmente informações de contacto direto de menores de 13 anos sem consentimento dos pais. Se acredita que coletamos dados indevidamente, contacte-nos para remoção imediata.
      </p>
    </section>

    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <Lock class="text-primary-500" size={24} /> 5. Segurança
      </h2>
      <p class="text-surface-600 dark:text-surface-300 leading-relaxed">
        Implementamos medidas de segurança técnicas e organizacionais (como encriptação SSL e hashing de senhas) para proteger os seus dados contra acesso não autorizado, alteração ou destruição.
      </p>
    </section>

    <div class="pt-8 border-t border-surface-200 dark:border-surface-800">
        <p class="text-surface-500 text-sm">
            Para questões de privacidade ou para exercer o seu direito ao esquecimento (apagar dados), envie email para <a href="mailto:privacy@KMind.co.mz" class="text-primary-600 font-bold hover:underline">privacy@KMind.co.mz</a>
        </p>
    </div>

  </div>
</div>