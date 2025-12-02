<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { 
    Send, Bot, ArrowLeft, Sparkles, Brain, X,
    Smile, Frown, BookOpen, Calculator, ChevronRight, GraduationCap
  } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import confetti from 'canvas-confetti';

  // --- ESTADO ---
  let studentId = $page.params.id || '';
  
  // View State: 'TOPICS' (Menu) ou 'CHAT' (Sala de Aula)
  let viewState: 'TOPICS' | 'CHAT' = 'TOPICS';
  
  // Contexto da Sessão (O que vai ser enviado para a IA)
  let sessionContext = {
      subject: '', // ex: 'Português'
      topic: ''    // ex: 'Verbos'
  };

  // Dados do Currículo
  let availableTopics = { matematica: [], portugues: [] };
  let loadingTopics = true;

  // --- ESTADO DO CHAT ---
  let messageInput = '';
  let isTyping = false;
  let chatContainer: HTMLElement;

  let currentAiMessage = {
      text: "",
      emotion: "NEUTRAL",
      type: "FREE_TEXT",
      data: {} as any
  };

  let historyLog: Array<{ sender: 'user'|'ai', text: string }> = [];

  // Cores dinâmicas do mascote
  $: mascotState = getMascotState(currentAiMessage.emotion);

  // --- LIFECYCLE ---
  onMount(async () => {
      await loadStudentAndTopics();
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
  });

  afterUpdate(() => {
    if (viewState === 'CHAT' && chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  // --- CARREGAMENTO DE DADOS ---
  async function loadStudentAndTopics() {
      try {
          // 1. Buscar Classe do Aluno
          const resUser = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
          if (!resUser.ok) throw new Error('Erro aluno');
          const student = await resUser.json();
          const classe = student.classe || 3;

          // 2. Buscar Tópicos dessa Classe
          const resTopics = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/topics?classe=${classe}`);
          if (resTopics.ok) {
              availableTopics = await resTopics.json();
            }
            console.log(resTopics)
      } catch (e) {
          console.error("Erro ao carregar currículo:", e);
      } finally {
          loadingTopics = false;
      }
  }

  // --- SELEÇÃO DE TÓPICO ---
  function startSession(subject: string, topicName: string) {
      // 1. Define o Contexto
      sessionContext = { subject, topic: topicName };
      
      // 2. Muda a UI
      viewState = 'CHAT';
      historyLog = []; // Limpa histórico visual anterior
      
      // 3. Define a mensagem inicial LOCALMENTE (Sem gastar tokens ainda)
      // Isto dá a sensação imediata de "A IA sabe sobre o que estamos a falar"
      currentAiMessage = {
          text: `Olá! Vamos aprender sobre **${topicName}** (${subject}). O que queres saber?`,
          emotion: "HAPPY",
          type: "CHIPS",
          data: { options: ["Explica-me isto", "Dá-me um exemplo", "Vamos praticar"] }
      };
  }

  // --- LÓGICA DO CHAT (SEND) ---
  async function sendMessage(textOverride?: string) {
    const textToSend = textOverride || messageInput;
    if (!textToSend.trim() || isTyping) return;

    // Atualiza UI
    historyLog = [...historyLog, { sender: 'user', text: textToSend }];
    messageInput = '';
    isTyping = true;
    
    // Reset emocional
    currentAiMessage.emotion = "NEUTRAL"; 

    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                alunoId: parseInt(studentId), 
                userQuery: textToSend,
                // ✅ ENVIAR O CONTEXTO SELECIONADO
                subject: sessionContext.subject,
                topic: sessionContext.topic,
                mode: 'tutor' 
            })
        });

        if (res.ok) {
            const data = await res.json();
            handleAiResponse(data.response);
        } else {
            throw new Error('Erro API');
        }

    } catch (err: any) {
        currentAiMessage = {
            text: "Perdi a ligação... 🔌",
            emotion: "THOUGHTFUL",
            type: "CHIPS",
            data: { options: ["Tentar de novo"] }
        };
    } finally {
        isTyping = false;
    }
  }

  function handleAiResponse(rawText: string) {
      try {
          const content = JSON.parse(rawText);
          
          currentAiMessage = {
              text: content.text || "...",
              emotion: content.emotion || "NEUTRAL",
              type: content.interaction_type || "FREE_TEXT",
              data: content.interaction_data || {}
          };

          if (content.emotion === 'HAPPY') {
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }

          historyLog = [...historyLog, { sender: 'ai', text: content.text }];

      } catch (e) {
          console.warn("IA enviou texto plano:", e);
          currentAiMessage = {
              text: rawText,
              emotion: "NEUTRAL",
              type: "FREE_TEXT",
              data: {}
          };
          historyLog = [...historyLog, { sender: 'ai', text: rawText }];
      }
  }

  // --- HELPERS VISUAIS ---
  function getMascotState(emotion: string) {
      switch (emotion) {
          case 'HAPPY': return { color: 'from-green-400 to-emerald-500', icon: Smile, bubble: 'bg-green-50 dark:bg-green-900/20 border-green-200' };
          case 'THOUGHTFUL': return { color: 'from-orange-400 to-amber-500', icon: Frown, bubble: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200' };
          default: return { color: 'from-blue-400 to-indigo-500', icon: Bot, bubble: 'bg-white dark:bg-surface-800 border-surface-200' };
      }
  }

  function handleClozeOption(option: string) {
      const sentence = currentAiMessage.data.sentence || "";
      const completedSentence = sentence.replace("[[BLANK]]", option);
      sendMessage(`Escolhi: ${option}. (${completedSentence})`);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
  }
</script>

<div class="flex flex-col h-screen bg-surface-50 dark:bg-surface-900 relative font-sans overflow-hidden transition-colors duration-500">
    
    <div class="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 p-4 flex items-center justify-between shadow-sm z-30">
        <div class="flex items-center gap-3">
            {#if viewState === 'CHAT'}
                <button on:click={() => viewState = 'TOPICS'} class="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors">
                    <ArrowLeft size={24} />
                </button>
            {:else}
                <button on:click={() => goto(`/dashboard/student/${studentId}`)} class="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors">
                    <ArrowLeft size={24} />
                </button>
            {/if}
            
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
                    <Brain size={20} />
                </div>
                <div>
                    <h2 class="font-bold text-surface-800 dark:text-surface-100">KaniMente</h2>
                    <p class="text-xs text-surface-500 font-bold uppercase tracking-wider">
                        {viewState === 'CHAT' ? sessionContext.topic : 'Escolhe o Tópico'}
                    </p>
                </div>
            </div>
        </div>
    </div>

    {#if viewState === 'TOPICS'}
        <div class="flex-1 overflow-y-auto p-6">
            <div class="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-black text-surface-900 dark:text-white mb-2">O que vamos aprender?</h1>
                    <p class="text-surface-500">Escolhe um tema para o Kani te ajudar.</p>
                </div>

                {#if loadingTopics}
                    <div class="flex justify-center py-10">
                        <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                {:else}
                    <section>
                        <h3 class="text-xl font-bold text-surface-800 dark:text-surface-100 mb-4 flex items-center gap-2">
                            <Calculator class="text-blue-500" /> Matemática
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {#each availableTopics.matematica as topic}
                                <button 
                                    on:click={() => startSession('Matemática', topic.nome)}
                                    class="p-4 bg-white dark:bg-surface-800 rounded-2xl border-2 border-surface-200 dark:border-surface-700 
                                           hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all text-left group flex items-center justify-between"
                                >
                                    <span class="font-bold text-surface-700 dark:text-surface-200">{topic.nome}</span>
                                    <ChevronRight size={20} class="text-surface-400 group-hover:text-blue-500 transition-colors" />
                                </button>
                            {/each}
                        </div>
                    </section>

                    <section>
                        <h3 class="text-xl font-bold text-surface-800 dark:text-surface-100 mb-4 flex items-center gap-2">
                            <BookOpen class="text-green-500" /> Português
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {#each availableTopics.portugues as topic}
                                <button 
                                    on:click={() => startSession('Português', topic.nome)}
                                    class="p-4 bg-white dark:bg-surface-800 rounded-2xl border-2 border-surface-200 dark:border-surface-700 
                                           hover:border-green-400 dark:hover:border-green-500 hover:shadow-md transition-all text-left group flex items-center justify-between"
                                >
                                    <span class="font-bold text-surface-700 dark:text-surface-200">{topic.nome}</span>
                                    <ChevronRight size={20} class="text-surface-400 group-hover:text-green-500 transition-colors" />
                                </button>
                            {/each}
                        </div>
                    </section>
                {/if}
            </div>
        </div>

    {:else}
        <div class="flex-1 flex flex-col items-center justify-center p-6 space-y-8 overflow-y-auto relative" bind:this={chatContainer}>
            
            <div class="relative group">
                <div class={`w-32 h-32 md:w-40 md:h-40 bg-gradient-to-tr ${mascotState.color} rounded-full flex items-center justify-center shadow-xl animate-float transition-all duration-700`}>
                    <svelte:component this={mascotState.icon} size={64} class="text-white transition-all duration-300" />
                </div>
                {#if isTyping}
                    <div class="absolute -right-2 -top-2 bg-white dark:bg-surface-700 p-2 rounded-full shadow-lg animate-pulse">
                        <Sparkles class="text-yellow-400" size={24} />
                    </div>
                {/if}
            </div>

            <div class="relative max-w-2xl w-full animate-fade-in-up">
                <div class={`p-8 rounded-3xl shadow-xl border-2 text-center relative z-10 transition-all duration-500 ${mascotState.bubble}`}>
                    <div class={`absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 border-t-2 border-l-2 rotate-45 transition-colors duration-500 ${mascotState.bubble} border-transparent`}></div>
                    
                    <p class="text-xl md:text-2xl font-medium text-surface-800 dark:text-surface-100 leading-relaxed">
                        {#if isTyping}
                            <span class="opacity-50">Deixa-me pensar... 🤔</span>
                        {:else}
                            {@html currentAiMessage.text.replace(/\[\[BLANK\]\]/g, '<span class="text-primary-500 font-bold mx-1">...</span>')}
                        {/if}
                    </p>
                </div>
            </div>

            {#if historyLog.length > 0}
                <div class="opacity-30 text-center text-sm mt-8 max-w-md mx-auto pointer-events-none select-none transition-opacity duration-500">
                    <p>Última resposta: {historyLog[historyLog.length - 1].text.slice(0, 40)}...</p>
                </div>
            {/if}
        </div>

        <div class="bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 p-6 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-all duration-300">
            <div class="max-w-3xl mx-auto min-h-[80px] flex flex-col justify-center">
                
                {#if isTyping}
                    <div class="flex justify-center items-center gap-2 text-surface-400 font-bold text-sm uppercase tracking-widest animate-pulse">
                        <div class="w-2 h-2 bg-surface-400 rounded-full"></div>
                        <div class="w-2 h-2 bg-surface-400 rounded-full animation-delay-200"></div>
                        <div class="w-2 h-2 bg-surface-400 rounded-full animation-delay-400"></div>
                    </div>

                {:else if currentAiMessage.type === 'CHIPS'}
                    <div class="flex flex-wrap justify-center gap-3 animate-slide-up">
                        {#each (currentAiMessage.data.options || []) as option}
                            <button 
                                class="px-6 py-4 bg-surface-50 dark:bg-surface-700 hover:bg-blue-100 dark:hover:bg-blue-900/20 
                                       text-surface-700 dark:text-surface-200 font-bold text-lg rounded-2xl 
                                       border-2 border-surface-200 dark:border-surface-600 hover:border-blue-400 dark:hover:border-blue-500
                                       transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 shadow-sm"
                                on:click={() => sendMessage(option)}
                            >
                                {option}
                            </button>
                        {/each}
                    </div>

{:else if currentAiMessage.type === 'CLOZE'}
                    {:else if currentAiMessage.type === 'EXPLANATION'}
                    <div class="flex flex-wrap justify-center gap-4 animate-slide-up w-full">
                        {#if currentAiMessage.data.options && currentAiMessage.data.options.length > 0}
                            {#each currentAiMessage.data.options as option}
                                <button 
                                    class="min-w-[140px] px-6 py-4 
                                           font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 
                                           transition-all active:scale-95 flex items-center justify-center gap-2
                                           {option.includes('Não') ? 'bg-surface-200 text-surface-800 hover:bg-surface-300' : 'bg-blue-600 text-white hover:bg-blue-700'}"
                                    on:click={() => sendMessage(option)}
                                >
                                    {option}
                                </button>
                            {/each}
                        
                        {:else}
                            <button 
                                class="w-full max-w-sm px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white 
                                       font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 
                                       transition-all active:scale-95 flex items-center justify-center gap-2"
                                on:click={() => sendMessage(currentAiMessage.data.button_text || "Continuar")}
                            >
                                <span>{currentAiMessage.data.button_text || "Entendi 👍"}</span>
                                <ChevronRight size={24} />
                            </button>
                        {/if}
                    </div>

                {:else}
                    <div class="flex items-center gap-3 animate-slide-up">
                        <div class="flex-1 relative">
                            <input 
                                type="text" 
                                class="w-full pl-6 pr-12 py-4 bg-surface-100 dark:bg-surface-900 border-2 border-transparent 
                                       focus:border-blue-400 focus:bg-white dark:focus:bg-surface-950 rounded-2xl outline-none transition-all 
                                       text-surface-900 dark:text-surface-100 placeholder-surface-400 text-lg shadow-inner"
                                placeholder={currentAiMessage.data.placeholder || "Escreve a tua resposta aqui..."}
                                bind:value={messageInput}
                                on:keydown={handleKeydown}
                                autocomplete="off"
                            />
                        </div>
                        <button 
                            class="p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none
                                   hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                            on:click={() => sendMessage()}
                            disabled={!messageInput.trim()}
                        >
                            <Send size={24} fill="currentColor" />
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
    }
    .animate-float {
        animation: float 5s ease-in-out infinite;
    }
    
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up {
        animation: slideUp 0.3s ease-out forwards;
    }
    
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
        animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .animation-delay-200 { animation-delay: 200ms; }
    .animation-delay-400 { animation-delay: 400ms; }
</style>