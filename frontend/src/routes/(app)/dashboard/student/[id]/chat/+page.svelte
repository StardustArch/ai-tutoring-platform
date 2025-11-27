<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { 
    Send, Bot, ArrowLeft, Sparkles, Brain, X,
    Smile, Frown, MessageCircle // Ícones de emoção
  } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import confetti from 'canvas-confetti'; // 🎉 Importante!

  // --- ESTADO ---
  let studentId = $page.params.id || '';
  
  // --- INTERAÇÃO ---
  let messageInput = '';
  let isTyping = false;
  let chatContainer: HTMLElement;

  // Estado Atual da IA (com Emoção)
  let currentAiMessage = {
      text: "Olá! 👋 Sou o KaniMente. O que vamos aprender hoje?",
      emotion: "NEUTRAL", // HAPPY, THOUGHTFUL, NEUTRAL
      type: "FREE_TEXT",
      data: {} as any
  };

  let historyLog: Array<{ sender: 'user'|'ai', text: string }> = [];

  // --- CORES E ÍCONES DINÂMICOS ---
  // Mapeia a emoção da IA para visual
  $: mascotState = getMascotState(currentAiMessage.emotion);

  function getMascotState(emotion: string) {
      switch (emotion) {
          case 'HAPPY': 
              return { 
                  color: 'from-green-400 to-emerald-500', 
                  icon: Smile, 
                  bubble: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              };
          case 'THOUGHTFUL': // Erro ou Correção
              return { 
                  color: 'from-orange-400 to-amber-500', 
                  icon: Frown, // Ou um ícone de "pensativo"
                  bubble: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
              };
          default: // NEUTRAL
              return { 
                  color: 'from-blue-400 to-indigo-500', 
                  icon: Bot, 
                  bubble: 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700' 
              };
      }
  }

  // --- LÓGICA DE RESPOSTA ---
  function handleAiResponse(rawText: string) {
      try {
          const content = JSON.parse(rawText);
          
          currentAiMessage = {
              text: content.text || "...",
              emotion: content.emotion || "NEUTRAL", // ✅ Captura a emoção
              type: content.interaction_type || "FREE_TEXT",
              data: content.interaction_data || {}
          };

          // 🎉 Feedback Positivo Visual
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

  async function sendMessage(textOverride?: string) {
    const textToSend = textOverride || messageInput;
    if (!textToSend.trim() || isTyping) return;

    historyLog = [...historyLog, { sender: 'user', text: textToSend }];
    messageInput = '';
    isTyping = true;
    
    // Reset emocional enquanto pensa
    currentAiMessage.emotion = "NEUTRAL"; 

    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                alunoId: parseInt(studentId), 
                userQuery: textToSend,
                mode: 'tutor' 
            })
        });

        if (res.ok) {
            const data = await res.json();
            handleAiResponse(data.response);
        } else {
            throw new Error('Erro na API');
        }

    } catch (err: any) {
        currentAiMessage = {
            text: "Ops! Perdi a conexão. 🔌",
            emotion: "THOUGHTFUL",
            type: "CHIPS",
            data: { options: ["Tentar de novo"] }
        };
    } finally {
        isTyping = false;
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
            <button on:click={() => goto(`/dashboard/student/${studentId}`)} class="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors">
                <ArrowLeft size={24} />
            </button>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
                    <Brain size={20} />
                </div>
                <div>
                    <h2 class="font-bold text-surface-800 dark:text-surface-100">KaniMente</h2>
                    <p class="text-xs text-surface-500 font-bold uppercase tracking-wider">Tutor IA</p>
                </div>
            </div>
        </div>
    </div>

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
                        {currentAiMessage.text}
                    {/if}
                </p>
            </div>
        </div>

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
                <div class="flex flex-col items-center gap-6 animate-slide-up">
                    <div class="text-xl md:text-2xl font-bold text-surface-700 dark:text-surface-200 text-center">
                        {@html (currentAiMessage.data.sentence || "")
                            .replace('[[BLANK]]', '<span class="inline-block border-b-4 border-dashed border-blue-400 px-8 mx-2 text-transparent select-none bg-blue-50 dark:bg-blue-900/20 rounded-lg min-w-[80px] animate-pulse">?</span>')}
                    </div>
                    
                    <div class="flex flex-wrap justify-center gap-4">
                        {#each (currentAiMessage.data.options || []) as option}
                            <button 
                                class="px-8 py-4 bg-white dark:bg-surface-700 border-b-4 border-2 border-surface-300 dark:border-surface-600 
                                       rounded-xl font-bold text-lg text-surface-800 dark:text-white
                                       hover:bg-blue-50 dark:hover:bg-surface-600 hover:border-blue-300 
                                       transition-all active:border-b-2 active:translate-y-[2px]"
                                on:click={() => handleClozeOption(option)}
                            >
                                {option}
                            </button>
                        {/each}
                    </div>
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
    
    .animation-delay-200 { animation-delay: 200ms; }
    .animation-delay-400 { animation-delay: 400ms; }
</style>