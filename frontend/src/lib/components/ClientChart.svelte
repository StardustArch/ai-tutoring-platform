<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  export let options: any = {};
  export let series: any = [];
  export let type: string = 'line';
  export let height: number | string = 250;

  let chartContainer: HTMLDivElement;
  let chart: any = null;

  async function loadChart() {
    if (!browser) return;

    try {
      const module = await import('apexcharts');
      const ApexCharts = module.default;

      // ✅ A CORREÇÃO ESTÁ AQUI:
      // 1. Lemos a cor que o Tailwind aplicou à <div> container
      const styles = window.getComputedStyle(chartContainer);
      const textColor = styles.color; 

      const config = {
        ...options,
        series: series,
        chart: {
          ...options.chart,
          type: type,
          height: height,
          fontFamily: 'inherit',
          background: 'transparent',
          
          // 2. Injetamos essa cor no ApexCharts
          foreColor: textColor, 
          
          toolbar: { show: false },
          animations: { enabled: true }
        },
        // Força as Tooltips a terem fundo escuro/claro correto se necessário
        tooltip: {
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
        }
      };

      if (chart) {
        chart.destroy();
      }

      chart = new ApexCharts(chartContainer, config);
      await chart.render();

    } catch (e) {
      console.error("Erro ao carregar ApexCharts:", e);
    }
  }

  onMount(() => {
    // Pequeno delay para garantir que o CSS do Dark Mode já carregou
    setTimeout(loadChart, 50);
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  // Atualiza os dados se mudarem
  $: if (chart && series) {
      chart.updateSeries(series);
  }
</script>

<div 
    bind:this={chartContainer} 
    class="w-full text-surface-600 dark:text-surface-400 transition-colors duration-300" 
    style="min-height: {height}px;"
></div>