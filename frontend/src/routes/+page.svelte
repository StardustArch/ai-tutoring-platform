<script lang="ts">
    import '../app.css'
  // Importar o switch para poderes testar o tema logo na entrada
  import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
</script>

<div class="min-h-screen flex flex-col items-center justify-center p-4 bg-surface-50-900-token transition-colors duration-300">
  
  <div class="absolute top-4 right-4">
    <ThemeSwitch />
  </div>

  <div class="text-center max-w-2xl space-y-8">
    
    <h1 class="h1 font-bold text-primary-500 tracking-tight">
      Bem-vindo ao KaniMente
    </h1>
    
    <p class="text-xl text-surface-600-300-token">
      O seu tutor educacional com Inteligência Artificial.
      Apoio para crianças da 3ª à 6ª classe em Português e Matemática.
    </p>

    <div class="flex justify-center gap-4 pt-4">
      <a
        href="/login"
        class="btn variant-filled-primary btn-lg font-semibold shadow-lg"
      >
        Entrar (Login)
      </a>

      <a
        href="/register"
        class="btn variant-ringed-primary btn-lg font-semibold"
      >
        Registar
      </a>
    </div>

  </div>
</div>