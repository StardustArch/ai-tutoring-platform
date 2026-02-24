<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST, PUBLIC_IA_HOST_API_URL } from '$env/static/public';
  import { 
    Send, Bot, ArrowLeft, Sparkles, Brain, X,
    Smile, Frown, BookOpen, Calculator, ChevronRight, GraduationCap, Volume2, Star
  } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import confetti from 'canvas-confetti';
  import SessionTimer from '$lib/components/SessionTimer.svelte';

  // --- PARÂMETROS ---
  let studentId = $page.params.id || '';
  let sessionId = $page.url.searchParams.get('sessionId') ? parseInt($page.url.searchParams.get('sessionId')!) : null;
  $: turmaId =  $page.params.class ? parseInt($page.params.class!) : null;

  let allowedTopicIds: number[] = []; 
  let viewState: 'TOPICS' | 'CHAT' | 'GAMEOVER' = 'TOPICS';
  
  let sessionContext = { subject: '', topic: '' };
  let lastAudio: HTMLAudioElement | null = null;
let availableTopics: { [key: string]: any[] } = { 
    matematica: [], 
    portugues: [] 
};
  let loadingTopics = true;
  let isTimeUp = false; // <--- NOVA VARIÁVEL DE ESTADO
  let availableVoices: SpeechSynthesisVoice[] = [];

  // --- ESTADO DO CHAT ---
  let messageInput = '';
  let isTyping = false;
  let chatContainer: HTMLElement;
  let isRevealing = false;
  
  // 🚨 CORREÇÃO VISUAL: Usamos esta lista para renderizar os balões um a um
  let visibleBubbles: string[] = []; 

  let currentAiMessage = {
      messages: [] as string[],
      emotion: "NEUTRAL",
      type: "FREE_TEXT",
      data: {} as any
  };

  let historyLog: Array<{ sender: 'user'|'ai', text: string }> = [];
  $: mascotState = getMascotState(currentAiMessage.emotion);

  // --- LIFECYCLE ---
  onMount(async () => {
      await loadStudentAndTopics();
  });

  onDestroy(() => {
    if (typeof window !== 'undefined' && lastAudio) lastAudio.pause();
  });

  afterUpdate(() => {
    if (viewState === 'CHAT' && chatContainer) {
        // Scroll suave para o fundo
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  });

  // --- FUNÇÃO DE TEMPO ESGOTADO ---
  function handleTimeUp() {
      isTimeUp = true;
      viewState = 'GAMEOVER';
      if (typeof window !== 'undefined' && lastAudio) lastAudio.pause();
  }
  // --- CARREGAMENTO (MANTIDO IGUAL) ---
  async function loadStudentAndTopics() {
      loadingTopics = true;
      try {
          if (sessionId) {
              const resSession = await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}`);
              if (resSession.ok) {
                  const sessionData = await resSession.json();
                  let rawIds = sessionData.topicosAlvo;
                  if (typeof rawIds === 'string') { try { rawIds = JSON.parse(rawIds); } catch(e) {} }
                  if (Array.isArray(rawIds)) allowedTopicIds = rawIds.map((id: any) => Number(id));
              }
          }
          const resUser = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
          if (!resUser.ok) throw new Error('Erro aluno');
          const student = await resUser.json();
          const classe = student.classe || 3;
          const resTopics = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/topics?classe=${classe}&studentId=${studentId}`);
          
          if (resTopics.ok) {
              const allTopics = await resTopics.json();
              if (sessionId) {
                  availableTopics.matematica = (allTopics.matematica || []).filter((t: any) => allowedTopicIds.includes(Number(t.id)));
                  availableTopics.portugues = (allTopics.portugues || []).filter((t: any) => allowedTopicIds.includes(Number(t.id)));
              } else {
                  availableTopics = allTopics;
              }
            }
      } catch (e) {
          console.error("Erro ao carregar currículo:", e);
      } finally {
          loadingTopics = false;
      }
  }

  function speakText() {
      if (lastAudio) {
          lastAudio.currentTime = 0;
          lastAudio.play();
      }
  }

  function startSession(subject: string, topicName: string) {
      sessionContext = { subject, topic: topicName };
      viewState = 'CHAT';
      historyLog = []; 
      const introMessages = [`Olá campeão! 🌟`, `Hoje vamos dominar **${topicName}**!`, "Estás pronto?"];
      handleAiResponse(JSON.stringify({
          messages: introMessages,
          emotion: "HAPPY",
          interaction_type: "CHIPS",
          interaction_data: { options: ["Vamos lá!", "O que é isso?"] }
      }));
  }

  async function sendMessage(textOverride?: string) {
    const textToSend = textOverride || messageInput;
    if (!textToSend.trim() || isTyping) return;

    // Adiciona ao histórico visual (se for texto livre)
    if (!textOverride) {
        // historyLog = [...historyLog, { sender: 'user', text: textToSend }];
    }
    
    messageInput = '';
    isTyping = true;
    visibleBubbles = []; // Limpa balões para dar efeito de "pensando"
    
    // Feedback imediato visual (opcional)
    currentAiMessage.emotion = "THOUGHTFUL"; 

    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                alunoId: parseInt(studentId), 
                userQuery: textToSend,
                subject: sessionContext.subject,
                topic: sessionContext.topic,
                mode: 'tutor',
                turmaId: turmaId,
                sessaoId: sessionId || null
            })
        });

        if (res.ok) {
            const data = await res.json();
            handleAiResponse(data.response);
        } else {
            throw new Error('Erro API');
        }
    } catch (err: any) {
        handleAiResponse(JSON.stringify({
            messages: ["Eish, a minha internet tropeçou! 🔌", "Podes repetir?"],
            emotion: "SAD",
            interaction_type: "CHIPS",
            interaction_data: { options: ["Tentar de novo"] }
        }));
    } finally {
        isTyping = false;
    }
  }

  function handleAiResponse(rawText: string) {
      try {
          const content = JSON.parse(rawText);
          let msgs: string[] = [];
          
          if (content.messages && Array.isArray(content.messages)) {
              msgs = content.messages;
          } else if (content.text) {
              msgs = [content.text];
          } else {
              msgs = ["..."];
          }

          currentAiMessage = {
              messages: msgs,
              emotion: content.emotion || "NEUTRAL",
              type: content.interaction_type || "FREE_TEXT",
              data: content.interaction_data || {}
          };

          // Efeito de Confetti se estiver feliz
          if (content.emotion === 'HAPPY' || content.assessment === 'CORRECT') {
              confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FFD700', '#FF4500', '#00BFFF'] });
          }

          // Áudio
          if (content.audio_url) {
              const fullAudioUrl = `${PUBLIC_IA_HOST_API_URL}${content.audio_url}`;
              lastAudio = new Audio(fullAudioUrl);
              lastAudio.play().catch(e => console.warn("Autoplay bloqueado"));
          }

          // Inicia a sequência de balões
          triggerBubbleSequence(msgs);

      } catch (e) {
          console.warn("IA enviou texto plano:", e);
          triggerBubbleSequence([rawText]);
      }
  }

  function getMascotState(emotion: string) {
      // Cores mais vibrantes e ícones mais expressivos
      switch (emotion) {
          case 'HAPPY': return { color: 'bg-green-400', ring: 'ring-green-200', icon: Smile, animation: 'animate-bounce-slow' };
          case 'INTERESTED': return { color: 'bg-violet-500', ring: 'ring-violet-200', icon: Sparkles, animation: 'animate-pulse' };
          case 'THOUGHTFUL': return { color: 'bg-amber-400', ring: 'ring-amber-200', icon: Brain, animation: 'animate-float' };
          case 'SAD': return { color: 'bg-rose-400', ring: 'ring-rose-200', icon: Frown, animation: 'animate-shake' };
          default: return { color: 'bg-blue-500', ring: 'ring-blue-200', icon: Bot, animation: 'animate-float' };
      }
  }

  async function triggerBubbleSequence(messages: string[]) {
      isRevealing = true;
      visibleBubbles = []; 

      for (let i = 0; i < messages.length; i++) {
          // Pequena pausa para criar ritmo de leitura
          const delay = i === 0 ? 100 : Math.min(messages[i-1].length * 20, 1000); 
          await new Promise(r => setTimeout(r, delay));
          visibleBubbles = [...visibleBubbles, messages[i]];
      }
      isRevealing = false;
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
  }

  async function exitSession() {
      if (sessionId) await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}/end`, { method: 'PATCH' });
      goto(`/dashboard/foreman/student/${studentId}/class`);
  }
</script>

<svelte:head>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="flex flex-col h-screen bg-gradient-to-b from-sky-200 via-blue-50 to-white font-['Fredoka'] overflow-hidden">
    
    <div class="bg-white/80 backdrop-blur-md border-b border-blue-100 p-3 flex items-center justify-between shadow-sm z-30">
        <div class="flex items-center gap-3">
            <button 
                on:click={() => viewState === 'CHAT' ? viewState = 'TOPICS' : (sessionId ? exitSession() : goto(`/dashboard/student/${studentId}/class`))} 
                class="p-2 rounded-full bg-white border-2 border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-all shadow-sm active:scale-95"
            >
                <ArrowLeft size={24} strokeWidth={3} />
            </button>
            
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center shadow-md border-2 border-white">
                    <Brain size={20} />
                </div>
                <div>
                    <h2 class="font-bold text-slate-700 leading-tight">KaniMente</h2>
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        {viewState === 'CHAT' ? sessionContext.topic : 'Menu Principal'}
                    </p>
                </div>
            </div>
        </div>
        {#if viewState !== 'GAMEOVER'}
             <div class="scale-90 sm:scale-100">
                <SessionTimer on:timeup={handleTimeUp} />
             </div>
        {/if}
    </div>

    {#if viewState === 'GAMEOVER'}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center animate-zoom-in bg-white/50 backdrop-blur-sm">
            <div class="mb-6 text-8xl animate-bounce">⏰</div>
            <h1 class="text-4xl md:text-5xl font-black text-slate-800 mb-4">Tempo Esgotado!</h1>
            <p class="text-slate-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                Uau, passou a voar! O teu cérebro trabalhou muito bem hoje. Vamos fazer uma pausa para recarregar energias?
            </p>
            
            <button 
                on:click={() => exitSession()} 
                class="px-10 py-5 bg-blue-500 text-white rounded-2xl font-bold text-xl shadow-lg border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 hover:brightness-110 transition-all"
            >
                Terminar por Hoje
            </button>
        </div>
{:else if viewState === 'TOPICS'}
        <div class="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <div class="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                
                <div class="text-center py-6">
                    <h1 class="text-3xl md:text-4xl font-black text-slate-800 mb-2 drop-shadow-sm">O que vamos aprender? 🚀</h1>
                    <p class="text-slate-500 font-medium text-lg">Escolhe uma missão para começarmos!</p>
                </div>

                {#if loadingTopics}
                    <div class="flex justify-center py-20">
                        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                {:else}
                    {#if availableTopics.matematica.length > 0}
                    <section class="bg-white/60 p-6 rounded-3xl border border-blue-100 shadow-sm">
                        <h3 class="text-2xl font-black text-slate-700 mb-4 flex items-center gap-3">
                            <div class="p-2 bg-blue-100 rounded-xl text-blue-600"><Calculator size={28} /></div>
                            Matemática
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {#each availableTopics.matematica as topic}
                                <button 
                                    on:click={() => startSession('Matemática', topic.nome)}
                                    class="group relative p-4 bg-white rounded-2xl border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 active:bg-blue-50 hover:border-blue-300 transition-all text-left flex items-center justify-between shadow-sm hover:shadow-md"
                                >
                                    <span class="font-bold text-slate-700 text-lg group-hover:text-blue-600 transition-colors">{topic.nome}</span>
                                    <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-300 group-hover:bg-blue-500 group-hover:text-white flex items-center justify-center transition-all">
                                        <ChevronRight size={20} strokeWidth={3} />
                                    </div>
                                </button>
                            {/each}
                        </div>
                    </section>
                    {/if}

                    {#if availableTopics.portugues.length > 0}
                    <section class="bg-white/60 p-6 rounded-3xl border border-green-100 shadow-sm">
                        <h3 class="text-2xl font-black text-slate-700 mb-4 flex items-center gap-3">
                            <div class="p-2 bg-green-100 rounded-xl text-green-600"><BookOpen size={28} /></div>
                            Português
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {#each availableTopics.portugues as topic}
                                <button 
                                    on:click={() => startSession('Português', topic.nome)}
                                    class="group relative p-4 bg-white rounded-2xl border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 active:bg-green-50 hover:border-green-300 transition-all text-left flex items-center justify-between shadow-sm hover:shadow-md"
                                >
                                    <span class="font-bold text-slate-700 text-lg group-hover:text-green-600 transition-colors">{topic.nome}</span>
                                    <div class="w-8 h-8 rounded-full bg-green-50 text-green-300 group-hover:bg-green-500 group-hover:text-white flex items-center justify-center transition-all">
                                        <ChevronRight size={20} strokeWidth={3} />
                                    </div>
                                </button>
                            {/each}
                        </div>
                    </section>
                    {/if}
                {/if}
            </div>
        </div>

    {:else}
    
        <div class="flex-1 overflow-y-auto relative pb-48 scroll-smooth" bind:this={chatContainer}>
            
            <div class="flex flex-col md:items-center items-start justify-start pt-6 md:pt-10 px-4 space-y-6 min-h-[60vh]">
                
                <div class="w-full flex justify-center relative z-10 shrink-0">
                    <div class={`absolute inset-0 rounded-full opacity-30 blur-xl ${mascotState.color}`}></div>
                    
                    <div class={`
                        w-28 h-28 md:w-48 md:h-48 rounded-full shadow-xl flex items-center justify-center 
                        border-4 border-white transition-all duration-700
                        ${mascotState.color} ${mascotState.animation}
                    `}>
                        <svelte:component this={mascotState.icon} size={$page.url.searchParams.get('mobile') ? 48 : 80} class="text-white drop-shadow-md w-12 h-12 md:w-20 md:h-20" strokeWidth={2.5} />
                    </div>

                    {#if isTyping}
                        <div class="absolute right-1/3 md:-right-4 top-0 bg-white p-2 md:p-3 rounded-full shadow-lg animate-bounce">
                            <Sparkles class="text-yellow-400 fill-yellow-400 w-5 h-5 md:w-6 md:h-6" />
                        </div>
                    {/if}
                </div>

                <div class="w-full max-w-2xl flex flex-col md:items-center items-start space-y-3 pb-4">
                    {#if visibleBubbles.length > 0}
                        {#each visibleBubbles as bubble, i}
                            <div class={`
                                animate-pop-in relative
                                px-5 py-3 md:px-8 md:py-5 
                                shadow-sm border-b-4 
                                max-w-[95%] md:max-w-[85%] w-auto
                                transition-all duration-500
                                bg-white border-slate-200 text-slate-700
                                
                                /* MUDANÇA CRÍTICA: Mobile = Balão de Fala (Esquerda) | Desktop = Cartão (Centro) */
                                rounded-2xl rounded-tl-none md:rounded-3xl md:text-center text-left
                            `} style="animation-delay: {i * 100}ms;">
                                
                                <p class="text-lg md:text-2xl font-medium leading-snug md:leading-relaxed">
                                    {@html bubble}
                                </p>
                            </div>
                        {/each}
                        
                        {#if visibleBubbles.length === currentAiMessage.messages.length && !isRevealing}
                        <div class="self-start md:self-center pl-2 md:pl-0">
                             <button 
                                on:click={() => speakText()} 
                                class="mt-1 p-2 md:p-3 rounded-full bg-slate-100 text-slate-400 hover:text-blue-500 hover:scale-110 transition-all"
                                title="Ouvir novamente"
                            >
                                <Volume2 size={20} class="md:w-6 md:h-6" />
                            </button>
                        </div>
                        {/if}

                    {:else if !isTyping}
                         <div class="w-full text-center opacity-50 text-sm font-bold animate-pulse text-slate-400 mt-4">
                            À espera do Kani...
                         </div>
                    {/if}
                </div>
            </div>
        </div>

        <div class="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t-2 border-slate-100 p-4 pb-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div class="max-w-3xl mx-auto min-h-[80px] flex flex-col justify-center">
                
                {#if isTyping}
                    <div class="flex justify-center items-center gap-2">
                        <span class="sr-only">Kani está a escrever...</span>
                        <div class="h-3 w-3 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div class="h-3 w-3 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div class="h-3 w-3 bg-blue-400 rounded-full animate-bounce"></div>
                    </div>

                {:else if currentAiMessage.type === 'CHIPS' || currentAiMessage.type === 'TESTING' || (currentAiMessage.data.options && currentAiMessage.data.options.length > 0)}
                    
                    <div class="flex flex-wrap justify-center gap-3 w-full px-2 animate-slide-up">
                        {#each (currentAiMessage.data.options || []) as option}
                            <button 
                                class="
                                    min-w-[140px] px-6 py-4 text-xl font-bold rounded-2xl shadow-md border-b-4 
                                    transition-all transform hover:-translate-y-1 active:border-b-0 active:translate-y-1
                                    flex items-center justify-center gap-2
                                    {option.toLowerCase().includes('não') || option.toLowerCase().includes('percebi')
                                        ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' 
                                        : 'bg-white text-blue-600 border-slate-200 hover:border-blue-500 hover:bg-blue-50'}
                                "
                                on:click={() => sendMessage(option)}
                            >
                                {option}
                            </button>
                        {/each}
                    </div>

                {:else if currentAiMessage.type === 'EXPLANATION'}
                    <div class="flex justify-center w-full animate-slide-up">
                        <button 
                            class="w-full max-w-sm px-8 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xl rounded-2xl shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 hover:brightness-110 transition-all flex justify-center items-center gap-3" 
                            on:click={() => sendMessage(currentAiMessage.data.button_text || "Continuar")}
                        >
                            <span>{currentAiMessage.data.button_text || "Entendi 👍"}</span>
                            <ChevronRight size={28} strokeWidth={3} />
                        </button>
                    </div>

                {:else}
                    <div class="flex items-center gap-3 animate-slide-up">
                        <div class="flex-1 relative">
                            <input 
                                type="text" 
                                class="w-full pl-6 pr-4 py-4 bg-slate-100 border-2 border-slate-200 
                                       focus:border-blue-400 focus:bg-white rounded-2xl outline-none transition-all 
                                       text-slate-700 placeholder-slate-400 text-lg font-bold shadow-inner"
                                placeholder={currentAiMessage.data.placeholder || "Escreve aqui..."}
                                bind:value={messageInput}
                                on:keydown={handleKeydown}
                                autocomplete="off"
                            />
                        </div>
                        <button 
                            class="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            on:click={() => sendMessage()}
                            disabled={!messageInput.trim()}
                        >
                            <Send size={28} fill="currentColor" strokeWidth={2} />
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    /* Animações CSS Personalizadas */
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-15px); }
    }
    .animate-float {
        animation: float 4s ease-in-out infinite;
    }
    
    @keyframes bounce-slow {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    .animate-bounce-slow {
        animation: bounce-slow 2s infinite;
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    .animate-shake {
        animation: shake 0.5s ease-in-out infinite;
    }
    
    @keyframes popIn {
        0% { opacity: 0; transform: scale(0.8) translateY(20px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-pop-in {
        animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up {
        animation: slideUp 0.3s ease-out forwards;
    }
    
    /* Esconder Scrollbar mas permitir scroll */
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>