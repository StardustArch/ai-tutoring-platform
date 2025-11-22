<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import { page } from '$app/stores'; // Correção na importação do store
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { 
    Send, Mic, Bot, User, ArrowLeft, RefreshCw, 
    Volume2, Sparkles, Zap, Brain 
  } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { notifications } from '$lib/store/notifications';
  
  // Componentes Personalizados
  import MessageDisplay from '$lib/components/MessageDisplay.svelte'; 
  import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte'; 

  // --- ESTADO ---
  let studentId = $page.params.id || '';
  
  // ✅ 1. Ler o Modo da URL (Padrão: 'tutor')
  let mode = $page.url.searchParams.get('mode') || 'tutor'; 
  
  // Configuração visual reativa baseada no modo
  $: isRush = mode === 'rush';
  $: themeColor = isRush ? 'text-yellow-600 bg-yellow-100' : 'text-blue-600 bg-blue-100';
  $: borderColor = isRush ? 'border-yellow-200' : 'border-blue-200';
  $: themeIcon = isRush ? Zap : Brain;

  let messageInput = '';
  let chatContainer: HTMLElement;
  
  let isTyping = false;         
  let isSpeaking = false;       
  let isAiMessageComplete = true; 
  
  let currentAiMessageId: number | null = null;

  // Arrays para gestão das opções (Chips)
  let interactiveSuggestions: string[] = []; 
  let pendingSuggestions: string[] = [];     

  type Message = {
    id: number;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isAudioPlaying?: boolean;
    isRendered?: boolean; 
  };

  let messages: Message[] = [];

  onMount(async () => {
    // Mensagem inicial baseada no modo
    const introText = isRush 
        ? "⚡ MODO RUSH ATIVADO! Estou pronto para o Quiz rápido. Qual é o tema?"
        : "Olá! 👋 Sou o KaniMente no Modo Tutor. O que queres aprender com calma hoje?";

    messages = [{ 
        id: 1, 
        text: introText, 
        sender: 'ai', 
        timestamp: new Date(),
        isRendered: true 
    }];

    // Sugestões iniciais também mudam conforme o modo
    interactiveSuggestions = isRush 
        ? ["Matemática Rápida 🧮", "Desafio de Português 📝"]
        : ["Explicar Matéria 🧠", "Ajuda nos TPC 📚"];
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
  });

  afterUpdate(() => {
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  });

  // --- TYPEWRITER HANDLER ---
  function handleAiMessageComplete() {
    isAiMessageComplete = true;
    
    const lastMessage = messages.at(-1);
    if (lastMessage) {
        lastMessage.isRendered = true; 
    }

    // Revelar opções escondidas
    if (pendingSuggestions.length > 0) {
        interactiveSuggestions = [...pendingSuggestions];
        pendingSuggestions = []; 
    } else if (lastMessage?.text.includes("ERRO")) {
        interactiveSuggestions = ["Tentar novamente"];
    }
    
    currentAiMessageId = null;
    messages = [...messages]; 
  }

  // --- ENVIAR MENSAGEM ---
  async function sendMessage(textOverride?: string) {
    const textToSend = textOverride || messageInput;
    if (!textToSend.trim() || isTyping) return;

    if (isAiMessageComplete === false) {
        handleAiMessageComplete();
        return;
    }
    
    const userMsg: Message = { 
        id: Date.now(), 
        text: textToSend, 
        sender: 'user', 
        timestamp: new Date(), 
        isRendered: true 
    };
    messages = [...messages, userMsg];
    
    messageInput = '';
    interactiveSuggestions = []; 
    pendingSuggestions = [];
    isAiMessageComplete = false;
    isTyping = true;
    currentAiMessageId = userMsg.id + 1;

    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/chat/send`, {
            method: 'POST',
            // ✅ 2. Enviar o modo no corpo do pedido
            body: JSON.stringify({ 
                alunoId: parseInt(studentId), 
                userQuery: textToSend,
                mode: mode 
            })
        });

        if (res.ok) {
            const data = await res.json();
            let rawText = data.response || "";
            let cleanText = rawText;

            // Parser de Chips <<...>>
            const chipMatch = rawText.match(/<<(.+?)>>/);
            if (chipMatch && chipMatch[1]) {
                pendingSuggestions = chipMatch[1].split('|').map((c: string) => c.trim());
                cleanText = rawText.replace(/<<(.+?)>>/, '').trim();
            }

            const aiMsg: Message = {
                id: currentAiMessageId,
                text: cleanText,
                sender: 'ai',
                timestamp: new Date(),
                isRendered: false 
            };
            messages = [...messages, aiMsg]; 
            
        } else {
            throw new Error('Erro API');
        }

    } catch (err: any) {
        messages = [...messages, { 
            id: currentAiMessageId, 
            text: "O Kani perdeu a ligação... 🔌", 
            sender: 'ai', 
            timestamp: new Date(), 
            isRendered: true 
        }];
        handleAiMessageComplete();
    } finally {
        isTyping = false;
    }
  }

  // --- TTS ÁUDIO ---
  function speakText(msg: Message) {
    if (!('speechSynthesis' in window)) return;
    
    if (msg.isAudioPlaying) {
        window.speechSynthesis.cancel();
        msg.isAudioPlaying = false;
        messages = [...messages];
        return;
    }
    window.speechSynthesis.cancel();
    messages = messages.map(m => ({ ...m, isAudioPlaying: false }));

    const utterance = new SpeechSynthesisUtterance(msg.text);
    utterance.lang = 'pt-PT';
    utterance.rate = isRush ? 1.1 : 0.9; // Rush fala mais rápido!
    utterance.onstart = () => { msg.isAudioPlaying = true; messages = [...messages]; };
    utterance.onend = () => { msg.isAudioPlaying = false; messages = [...messages]; };
    window.speechSynthesis.speak(utterance);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
  }


      function restartChat() {
          messages = [];
          interactiveSuggestions = [];
            onMount(() => {});// Reinicia saudação
      }

</script>

<div class="flex flex-col h-screen bg-surface-50 dark:bg-surface-900 relative font-sans transition-colors duration-500">
    
    <div class="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 p-3 flex items-center justify-between shadow-sm z-20">
        <div class="flex items-center gap-3">
            <button on:click={() => goto(`/dashboard/student/${studentId}/chat/`)} class="p-2 rounded-full hover:bg-surface-100 text-surface-500">
                <ArrowLeft size={24} />
            </button>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full {themeColor} flex items-center justify-center shadow-md transition-all duration-300">
                    <svelte:component this={themeIcon} size={24} />
                </div>
                <div>
                    <h2 class="font-bold text-surface-800 dark:text-surface-100">KaniMente</h2>
                    <p class="text-xs text-surface-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        {isRush ? 'Modo Rush ⚡' : 'Modo Tutor 🎓'}
                    </p>
                </div>
            </div>
        </div>
        
        <button on:click={restartChat} class="p-2 text-surface-400 hover:text-red-500 transition-colors" title="Reiniciar Conversa">
            <RefreshCw size={20} />
        </button>
    </div>

    <div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-pattern">
        {#each messages as msg}
            <div class="flex w-full {msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in group">
                <div class="flex items-end gap-2 max-w-[85%] md:max-w-[70%]">
                    
                    {#if msg.sender === 'ai'}
                        <div class="w-8 h-8 rounded-full {isRush ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'} flex items-center justify-center mb-1 shadow-sm">
                            <svelte:component this={themeIcon} size={16} />
                        </div>
                    {/if}

                    <div class="relative">
                        <div class="px-5 py-3.5 rounded-2xl shadow-sm text-[1.05rem] leading-relaxed
                            {msg.sender === 'user' 
                                ? `bg-primary-600 text-white rounded-br-none` 
                                : `bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-100 border ${borderColor} rounded-bl-none`}"
                        >
                            {#if msg.sender === 'ai' && !msg.isRendered}
                                <MessageDisplay text={msg.text} onComplete={handleAiMessageComplete} />
                            {:else}
                                <MarkdownRenderer content={msg.text} />
                            {/if}
                        </div>

                        {#if msg.sender === 'ai' && msg.isRendered}
                            <button 
                                class="absolute -right-9 bottom-0 p-2 rounded-full text-surface-400 hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-all {msg.isAudioPlaying ? 'opacity-100 text-primary-600 animate-pulse' : ''}"
                                on:click={() => speakText(msg)}
                            >
                                <Volume2 size={20} />
                            </button>
                        {/if}
                    </div>
                </div>
            </div>
        {/each}

        {#if isTyping}
            <div class="flex justify-start animate-fade-in">
                <div class="flex items-end gap-2 ml-10">
                    <div class="bg-white dark:bg-surface-800 border p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                        <span class="w-2 h-2 {isRush ? 'bg-yellow-400' : 'bg-blue-400'} rounded-full animate-bounce"></span>
                        <span class="w-2 h-2 {isRush ? 'bg-yellow-400' : 'bg-blue-400'} rounded-full animate-bounce delay-75"></span>
                        <span class="w-2 h-2 {isRush ? 'bg-yellow-400' : 'bg-blue-400'} rounded-full animate-bounce delay-150"></span>
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <div class="bg-white dark:bg-surface-800 p-3 pb-5 border-t border-surface-200 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div class="max-w-3xl mx-auto space-y-3">
            
            {#if isAiMessageComplete && interactiveSuggestions.length > 0}
                <div class="flex gap-2 overflow-x-auto pb-2 px-1 no-scrollbar animate-slide-up">
                    {#each interactiveSuggestions as suggestion}
                        <button 
                            class="flex-shrink-0 btn px-5 py-2.5 bg-white dark:bg-surface-700 text-surface-700 dark:text-white 
                                   rounded-xl font-bold text-sm border-2 border-b-4 border-surface-200 dark:border-surface-600
                                   {isRush ? 'hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50' : 'hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'}
                                   active:border-b-2 active:translate-y-[2px] transition-all duration-100"
                            on:click={() => sendMessage(suggestion)}
                        >
                            {#if suggestion.toLowerCase().includes('ajuda') || suggestion.toLowerCase().includes('dica')}
                                💡 {suggestion}
                            {:else if suggestion.toLowerCase().includes('desafio')}
                                🏆 {suggestion}
                            {:else if !isNaN(parseInt(suggestion))}
                                🔢 {suggestion}
                            {:else}
                                ✨ {suggestion}
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}

            <div class="flex items-center gap-2">
                <div class="flex-1 relative">
                    <input 
                        type="text" 
                        class="w-full pl-5 pr-12 py-3.5 bg-surface-100 dark:bg-surface-900 border-2 border-transparent focus:border-primary-400 focus:bg-white rounded-2xl outline-none transition-all text-surface-900 placeholder-surface-400"
                        placeholder={isTyping ? "Kani está a pensar..." : "Escreve aqui..."}
                        bind:value={messageInput}
                        on:keydown={handleKeydown}
                        disabled={isTyping}
                        autocomplete="off"
                    />
                    <button class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-primary-600">
                        <Mic size={20} />
                    </button>
                </div>

                <button 
                    class="p-3.5 rounded-xl {isRush ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-primary-600 hover:bg-primary-700'} text-white shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    on:click={() => sendMessage()}
                    disabled={!messageInput.trim() || isTyping || !isAiMessageComplete}
                >
                    <Send size={20} fill="currentColor" />
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    /* Fundo texturizado */
    .bg-pattern {
        background-color: #f9fafb;
        background-image: radial-gradient(#d1d5db 1px, transparent 1px);
        background-size: 20px 20px;
    }
    :global(.dark) .bg-pattern {
        background-color: #111827;
        background-image: radial-gradient(#374151 1px, transparent 1px);
    }

    @keyframes slide-up {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up {
        animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .delay-75 { animation-delay: 75ms; }
    .delay-150 { animation-delay: 150ms; }
    
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>