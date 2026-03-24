<script lang="ts">
import { browser } from '$app/environment';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { Battery, BatteryWarning } from 'lucide-svelte';

  const MAX_TIME = 30 * 60; // 30 minutos

  // timerKey: chave do localStorage — muda por sessão para forçar reset
  export let timerKey = 'kmind_session_timer';

  // paused: quando true o timer congela (ex: durante loading de tópicos)
  export let paused = false;

  let timeLeft = MAX_TIME;
  let interval: ReturnType<typeof setInterval> | null = null;
  const dispatch = createEventDispatcher();

  $: percentage = (timeLeft / MAX_TIME) * 100;
  $: color = percentage > 50 ? 'bg-green-500'
           : percentage > 20 ? 'bg-yellow-500'
           : 'bg-red-500';

function startInterval() {
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (paused) return; // congela sem parar o interval
      if (timeLeft > 0) {
        timeLeft--;
        if (browser) localStorage.setItem(timerKey, timeLeft.toString()); // Guarda com segurança
      } else {
        clearInterval(interval!);
        interval = null;
        if (browser) localStorage.removeItem(timerKey); // Remove com segurança
        dispatch('timeup');
      }
    }, 1000);
  }




  onMount(() => {

    // Recupera o tempo guardado para ESTA chave específica
    const saved = localStorage.getItem(timerKey);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      // Só usa o valor guardado se for válido e menor que o máximo
      if (!isNaN(parsed) && parsed > 0 && parsed <= MAX_TIME) {
        timeLeft = parsed;
      }
    }
    startInterval();
  });

  // Quando a timerKey muda (nova sessão) → reseta o timer COM GUARD
  $: if (timerKey && browser) { // 👇 BROWSER GUARD ADICIONADO AQUI
    const saved = localStorage.getItem(timerKey);
    if (saved === null) {
      // Nova chave sem valor guardado → reinicia a partir do máximo
      timeLeft = MAX_TIME;
    }
  }

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  }
</script>

<div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
  <div class="{timeLeft < 60 ? 'animate-pulse text-red-500' : 'text-slate-600'}">
    {#if timeLeft < 300}
      <BatteryWarning size={18} />
    {:else}
      <Battery size={18} />
    {/if}
  </div>

  <div class="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
    <div class="h-full transition-all duration-1000 {color}" style="width: {percentage}%"></div>
  </div>

  <span class="text-xs font-mono font-bold text-slate-600 w-10 text-right {paused ? 'opacity-40' : ''}">
    {paused ? '--:--' : formatTime(timeLeft)}
  </span>
</div>