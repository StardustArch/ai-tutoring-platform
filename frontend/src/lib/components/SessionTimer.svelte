<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { Battery, BatteryWarning } from 'lucide-svelte';

  // Tempo padrão: 30 minutos em segundos
  const MAX_TIME = 30 * 60; 
  
  let timeLeft = MAX_TIME;
  let interval: any;
  const dispatch = createEventDispatcher();

  // Calcula a percentagem para a barra visual
  $: percentage = (timeLeft / MAX_TIME) * 100;
  
  // Cor muda conforme o tempo acaba
  $: color = percentage > 50 ? 'bg-green-500' 
           : percentage > 20 ? 'bg-yellow-500' 
           : 'bg-red-500';

  onMount(() => {
    interval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
      } else {
        clearInterval(interval);
        dispatch('timeup'); // Avisa a página principal que acabou
      }
    }, 1000);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
</script>

<div class="flex items-center gap-2 bg-white dark:bg-surface-800 px-3 py-1.5 rounded-full shadow-sm border border-surface-200 dark:border-surface-700">
  
  <div class="{timeLeft < 60 ? 'animate-pulse text-red-500' : 'text-surface-600'}">
    {#if timeLeft < 300} <BatteryWarning size={18} /> {:else} <Battery size={18} /> {/if}
  </div>

  <div class="w-24 h-2 bg-surface-200 rounded-full overflow-hidden">
    <div class="h-full transition-all duration-1000 {color}" style="width: {percentage}%"></div>
  </div>

  <span class="text-xs font-mono font-bold text-surface-600 dark:text-surface-300 w-10 text-right">
    {formatTime(timeLeft)}
  </span>
</div>