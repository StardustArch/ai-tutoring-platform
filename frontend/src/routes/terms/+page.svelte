<svelte:head>
    <title>Termos de Uso | KMind</title>
</svelte:head>

<script lang="ts">
  import { Shield, Scale, ScrollText, AlertTriangle, Copyright, Users, Gavel } from 'lucide-svelte';
  
  const lastUpdated = "20 de Fevereiro de 2026";
</script>

<div class="min-h-screen bg-white dark:bg-surface-950 transition-colors duration-300">
  
  <div class="bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 py-16 px-4">
    <div class="max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-800 text-surface-900 dark:text-white mb-6">
        <Scale size={24} />
      </div>
      <h1 class="text-4xl md:text-5xl font-black text-surface-900 dark:text-white tracking-tight mb-4">
        Termos de Uso
      </h1>
      <p class="text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
        Regras claras para manter o KMind um ambiente seguro e produtivo para a educação.
      </p>
      <p class="text-sm text-surface-500 mt-6 font-mono">
        Última atualização: {lastUpdated}
      </p>
    </div>
  </div>

  <div class="max-w-3xl mx-auto px-4 py-16 space-y-12">
    
    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <ScrollText class="text-primary-500" size={24} /> 1. Aceitação dos Termos
      </h2>
      <p class="text-surface-600 dark:text-surface-300 leading-relaxed">
        Ao criar uma conta ou utilizar a plataforma KMind, você concorda em cumprir estes Termos de Uso. Se não concordar com alguma parte destes termos, não deverá utilizar os nossos serviços. Estes termos aplicam-se a todos os visitantes, utilizadores e outras pessoas que acedam ou utilizem o Serviço.
      </p>
    </section>

    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <Users class="text-primary-500" size={24} /> 2. Contas de Utilizador
      </h2>
      <div class="space-y-4 text-surface-600 dark:text-surface-300 leading-relaxed">
        <p>
            <strong>Encarregados de Educação:</strong> São responsáveis por criar e gerir as contas dos seus educandos. Ao registar um menor, o Encarregado confirma que tem autoridade legal para consentir o uso da plataforma por parte da criança.
        </p>
        <p>
            <strong>Segurança:</strong> Você é responsável por manter a confidencialidade da sua senha. Notifique-nos imediatamente sobre qualquer violação de segurança ou uso não autorizado da sua conta.
        </p>
      </div>
    </section>

    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <AlertTriangle class="text-amber-500" size={24} /> 3. Uso de Inteligência Artificial
      </h2>
      <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-6 rounded-xl space-y-3">
        <p class="text-surface-800 dark:text-surface-200 font-medium">
            O KMind utiliza tecnologia de Inteligência Artificial para gerar conteúdos educativos e respostas. Embora nos esforcemos pela precisão:
        </p>
        <ul class="list-disc pl-5 space-y-2 text-surface-600 dark:text-surface-300 text-sm">
            <li>A IA pode ocasionalmente gerar informações incorretas (alucinações).</li>
            <li>O conteúdo não substitui o ensino formal nem a orientação de professores qualificados.</li>
            <li>Recomendamos a supervisão dos Encarregados durante o uso da plataforma.</li>
        </ul>
      </div>
    </section>

    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <Copyright class="text-primary-500" size={24} /> 4. Propriedade Intelectual
      </h2>
      <p class="text-surface-600 dark:text-surface-300 leading-relaxed">
        O Serviço e o seu conteúdo original (excluindo conteúdo fornecido pelos utilizadores), funcionalidades e design são e permanecerão propriedade exclusiva da KMind e dos seus licenciadores. O Serviço está protegido por direitos de autor e outras leis de Moçambique e países estrangeiros.
      </p>
    </section>

    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <Shield class="text-primary-500" size={24} /> 5. Conduta do Utilizador
      </h2>
      <p class="text-surface-600 dark:text-surface-300 leading-relaxed mb-4">
        Você concorda em não utilizar o Serviço para:
      </p>
      <ul class="list-disc pl-5 space-y-2 text-surface-600 dark:text-surface-300">
        <li>Qualquer fim ilegal ou não autorizado.</li>
        <li>Assediar, abusar ou prejudicar outra pessoa.</li>
        <li>Tentar contornar quaisquer medidas de segurança do Serviço.</li>
        <li>Carregar vírus ou outros códigos maliciosos.</li>
      </ul>
    </section>

    <section>
      <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-900 dark:text-white mb-4">
        <Gavel class="text-primary-500" size={24} /> 6. Lei Aplicável
      </h2>
      <p class="text-surface-600 dark:text-surface-300 leading-relaxed">
        Estes Termos serão regidos e interpretados de acordo com as leis de <strong>Moçambique</strong>, sem levar em conta o conflito de disposições legais. A nossa falha em fazer valer qualquer direito ou disposição destes Termos não será considerada uma renúncia a esses direitos.
      </p>
    </section>

    <div class="pt-8 border-t border-surface-200 dark:border-surface-800">
        <p class="text-surface-500 text-sm">
            Tem dúvidas sobre os termos? Contacte-nos em <a href="mailto:legal@KMind.co.mz" class="text-primary-600 font-bold hover:underline">legal@KMind.co.mz</a>
        </p>
    </div>

  </div>
</div>