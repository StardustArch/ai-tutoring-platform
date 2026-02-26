<svelte:head>
    <title>Gestão de Conteúdos - Admin KaniMente</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { confirm } from '$lib/store/confirm';
    import { fade, slide } from 'svelte/transition';
    import { 
        Folder, FolderOpen, FileText, Plus, Trash2, Pencil, 
        ChevronRight, ChevronDown, Layers, Search, MoreVertical,
        BookOpen, BrainCircuit, Palette, ChevronLeft,
        Hash, ListOrdered, Shapes, Calculator, X, Divide, 
        Scale, Coins, LineChart, Triangle, Sigma, Ruler, 
        PieChart, Equal, Activity, Tags, RefreshCcw, PenTool, 
        MessageSquare, TrafficCone, Heart, Home, Users, 
        TreePine, User, Truck, Radio, MapPin, Zap
    } from 'lucide-svelte';

    // MAPA DE ÍCONES
    const iconMap: Record<string, any> = {
        'Hash': Hash, 'ListOrdered': ListOrdered, 'Shapes': Shapes, 
        'Calculator': Calculator, 'X': X, 'Divide': Divide, 
        'Scale': Scale, 'Coins': Coins, 'LineChart': LineChart, 
        'Triangle': Triangle, 'Sigma': Sigma, 'Ruler': Ruler, 
        'PieChart': PieChart, 'Equal': Equal, 'Activity': Activity, 
        'Tags': Tags, 'RefreshCcw': RefreshCcw, 'PenTool': PenTool, 
        'MessageSquare': MessageSquare, 'TrafficCone': TrafficCone, 
        'Heart': Heart, 'Home': Home, 'BookOpen': BookOpen, 
        'Users': Users, 'TreePine': TreePine, 'User': User, 
        'Truck': Truck, 'Radio': Radio, 'MapPin': MapPin, 'Zap': Zap
    };
    
    const commonIcons = Object.keys(iconMap).sort();
    
    // --- ESTADO ---
    let treeData: any[] = []; 
    let topics: any[] = [];   
    let metaFields = { icon: 'Hash', color: 'bg-blue-500', desc: '', ai_rules: '' };

    const colors = [
        { label: 'Azul', val: 'bg-blue-500' }, { label: 'Verde', val: 'bg-green-500' },
        { label: 'Vermelho', val: 'bg-red-500' }, { label: 'Amarelo', val: 'bg-yellow-500' },
        { label: 'Roxo', val: 'bg-purple-500' }, { label: 'Laranja', val: 'bg-orange-500' },
        { label: 'Cinza', val: 'bg-slate-500' }, { label: 'Rosa', val: 'bg-pink-500' },
        { label: 'Teal', val: 'bg-teal-500' },
    ];

    let selectedDiscId: number | null = null;
    let selectedClass: number | null = null;
    let expandedDiscs: Set<number> = new Set();

    let loadingTree = true;
    let loadingTopics = false;

    // Modal
    let showModal = false;
    let modalMode: 'topic' | 'discipline' = 'topic';
    let isEditing = false;
    let formData: any = {}; 

    // --- LÓGICA ---
    async function loadTree() {
        loadingTree = true;
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/admin/content/tree`);
            if (res.ok) treeData = await res.json();
        } finally { loadingTree = false; }
    }
    onMount(loadTree);

    function toggleDisc(id: number) {
        if (expandedDiscs.has(id)) expandedDiscs.delete(id);
        else expandedDiscs.add(id);
        expandedDiscs = expandedDiscs;
    }

    async function selectClass(discId: number, classe: number) {
        selectedDiscId = discId;
        selectedClass = classe;
        await loadTopics();
    }

    // Função para voltar atrás no Mobile
    function backToTree() {
        selectedClass = null; // Isto fará o mobile mostrar a árvore novamente
    }

    async function loadTopics() {
        if (!selectedDiscId || !selectedClass) return;
        loadingTopics = true;
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/admin/content/topics?disciplinaId=${selectedDiscId}&classe=${selectedClass}`);
            if (res.ok) topics = await res.json();
        } finally { loadingTopics = false; }
    }

    // --- MODAIS E CRUD ---
    function openModalTopic(editMode: boolean, topic?: any) {
        modalMode = 'topic';
        isEditing = editMode;
        if (editMode && topic) {
            const meta = topic.metadata || {};
            metaFields = {
                icon: meta.icon || 'Hash', color: meta.color || 'bg-blue-500',
                desc: meta.desc || '', ai_rules: meta.ai_rules || ''
            };
            formData = { ...topic };
        } else {
            metaFields = { icon: 'Hash', color: 'bg-blue-500', desc: '', ai_rules: '' };
            formData = { nome: '', ordem: topics.length + 1, requisitoId: null };
        }
        showModal = true;
    }

    function openModalDiscipline() {
        modalMode = 'discipline';
        isEditing = false;
        formData = { nome: '' };
        showModal = true;
    }

    async function handleSubmit() {
        try {
            let url, method, body;
            if (modalMode === 'topic') {
                url = isEditing 
                    ? `${PUBLIC_API_URL_HOST}/api/admin/content/topics/${formData.id}`
                    : `${PUBLIC_API_URL_HOST}/api/admin/content/topics`;
                method = isEditing ? 'PATCH' : 'POST';
                const metadataObject = {
                    icon: metaFields.icon, color: metaFields.color,
                    desc: metaFields.desc, ai_rules: metaFields.ai_rules
                };
                body = {
                    nome: formData.nome, ordem: parseInt(formData.ordem),
                    requisitoId: formData.requisitoId || null, metadata: metadataObject
                };
                if (!isEditing) { body.disciplinaId = selectedDiscId; body.classe = selectedClass; }
            } else {
                url = `${PUBLIC_API_URL_HOST}/api/admin/content/disciplines`;
                method = 'POST';
                body = { nome: formData.nome };
            }
            const res = await apiFetch(url, { method, body: JSON.stringify(body) });
            if (res.ok) {
                showModal = false;
                if (modalMode === 'topic') loadTopics(); else loadTree();
            } else { alert('Erro ao salvar.'); }
        } catch (e) { alert('Erro interno.'); }
    }

    async function handleDeleteTopic(id: number) {
        if (await confirm({ title: 'Apagar Tópico', message: 'Tem a certeza?', type: 'danger' })) {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/admin/content/topics/${id}`, { method: 'DELETE' });
            if (res.ok) loadTopics();
        }
    }
</script>

<div class="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4 md:gap-6 animate-fade-in">
    
    <div class="w-full md:w-1/3 lg:w-1/4 flex flex-col bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden
                {selectedClass !== null ? 'hidden md:flex' : 'flex'}">
        
        <div class="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 flex justify-between items-center">
            <h2 class="font-bold text-surface-700 dark:text-surface-200 flex items-center gap-2">
                <Layers size={18} /> Estrutura
            </h2>
            <button on:click={openModalDiscipline} class="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-md transition-colors" title="Nova Disciplina">
                <Plus size={18} />
            </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {#if loadingTree}
                <div class="p-4 text-center text-sm text-surface-400">A carregar estrutura...</div>
            {:else}
                {#each treeData as disc}
                    <div class="select-none">
                        <button on:click={() => toggleDisc(disc.id)} class="w-full flex items-center gap-2 px-3 py-3 md:py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-left group">
                            {#if expandedDiscs.has(disc.id)}
                                <FolderOpen size={18} class="text-primary-500" />
                                <ChevronDown size={14} class="ml-auto text-surface-400" />
                            {:else}
                                <Folder size={18} class="text-surface-400 group-hover:text-primary-500 transition-colors" />
                                <ChevronRight size={14} class="ml-auto text-surface-400" />
                            {/if}
                            <span class="font-medium text-sm text-surface-700 dark:text-surface-200">{disc.nome}</span>
                        </button>

                        {#if expandedDiscs.has(disc.id)}
                            <div class="ml-4 pl-4 border-l border-surface-200 dark:border-surface-700 mt-1 space-y-0.5" transition:slide|local={{duration: 200}}>
                                {#each disc.classesDisponiveis as cls}
                                    <button 
                                        on:click={() => selectClass(disc.id, cls.classe)}
                                        class="w-full flex items-center justify-between px-3 py-2.5 md:py-1.5 rounded-md text-sm transition-colors
                                               {selectedDiscId === disc.id && selectedClass === cls.classe 
                                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium' 
                                                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-50 dark:hover:bg-surface-700/50'}"
                                    >
                                        <span>{cls.classe}ª Classe</span>
                                        <span class="text-[10px] px-1.5 py-0.5 bg-surface-200 dark:bg-surface-700 rounded-full text-surface-500">{cls.totalTopicos}</span>
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/each}
            {/if}
        </div>
    </div>

    <div class="flex-1 flex flex-col bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden relative
                {selectedClass === null ? 'hidden md:flex' : 'flex'}">
        
        {#if !selectedDiscId || !selectedClass}
            <div class="absolute inset-0 flex flex-col items-center justify-center text-surface-400 p-8 text-center animate-fade-in">
                <div class="w-20 h-20 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mb-4">
                    <Layers size={40} class="opacity-50" />
                </div>
                <h3 class="text-lg font-bold text-surface-600 dark:text-surface-300">Nenhuma Classe Selecionada</h3>
                <p class="text-sm max-w-xs mt-2 hidden md:block">Selecione uma disciplina e uma classe na árvore à esquerda.</p>
                <p class="text-sm max-w-xs mt-2 md:hidden">Selecione uma disciplina acima.</p>
            </div>
        {:else}
            <div class="p-4 md:p-6 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50/50 dark:bg-surface-900/20 sticky top-0 z-20 backdrop-blur-md">
                <div class="flex items-center gap-3">
                    <button on:click={backToTree} class="md:hidden p-2 -ml-2 text-surface-500 hover:text-primary-600">
                        <ChevronLeft size={24} />
                    </button>
                    
                    <div>
                        <div class="flex items-center gap-2 text-xs text-surface-500 uppercase tracking-wider mb-1">
                            <FolderOpen size={14} />
                            {treeData.find(d => d.id === selectedDiscId)?.nome}
                            <span class="hidden sm:inline"><ChevronRight size={12} /></span>
                        </div>
                        <h1 class="text-xl md:text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2 md:gap-3">
                            {selectedClass}ª <span class="hidden sm:inline">Classe</span>
                            <span class="text-xs md:text-sm font-normal text-surface-400 bg-surface-200 dark:bg-surface-700 px-2 py-0.5 rounded-full">
                                {topics.length}
                            </span>
                        </h1>
                    </div>
                </div>
                <button 
                    on:click={() => openModalTopic(false)}
                    class="btn variant-filled-primary flex items-center gap-2 shadow-lg px-3 py-2 text-sm"
                >
                    <Plus size={18} /> <span class="hidden sm:inline">Tópico</span>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-0">
                <table class="w-full text-left text-sm">
                    <thead class="bg-surface-50 dark:bg-surface-900/50 text-surface-500 font-semibold uppercase tracking-wider text-xs sticky top-0 z-10 hidden md:table-header-group">
                        <tr>
                            <th class="px-6 py-3 w-16 text-center">#</th>
                            <th class="px-6 py-3">Nome</th>
                            <th class="px-6 py-3">Requisito</th>
                            <th class="px-6 py-3">Config</th>
                            <th class="px-6 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                        {#if loadingTopics}
                            <tr><td colspan="5" class="p-8 text-center text-surface-400">A carregar...</td></tr>
                        {:else if topics.length === 0}
                            <tr><td colspan="5" class="p-12 text-center text-surface-400 italic">Vazio.</td></tr>
                        {:else}
                            {#each topics as topic}
                                <tr class="group hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors flex flex-col md:table-row border-b md:border-b-0 border-surface-100 dark:border-surface-700/50 p-3 md:p-0">
                                    <td class="md:px-6 md:py-4 md:text-center font-mono text-surface-400 text-xs md:text-sm order-1 md:order-none flex justify-between md:table-cell">
                                        <span class="md:hidden font-bold">Ordem:</span> {topic.ordem}
                                    </td>
                                    
                                    <td class="md:px-6 md:py-4 font-medium text-surface-900 dark:text-surface-100 flex items-center gap-3 order-2 md:order-none mb-2 md:mb-0">
                                        <FileText size={16} class="text-primary-500 shrink-0" />
                                        {topic.nome}
                                    </td>
                                    
                                    <td class="md:px-6 md:py-4 text-xs md:text-sm text-surface-500 order-3 md:order-none mb-1 md:mb-0">
                                        {#if topic.requisito}
                                            <span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600">
                                                <BookOpen size={10} /> Req: {topic.requisito.nome}
                                            </span>
                                        {/if}
                                    </td>
                                    
                                    <td class="md:px-6 md:py-4 order-4 md:order-none mb-2 md:mb-0">
                                        {#if topic.metadata && Object.keys(topic.metadata).length > 0}
                                            <span class="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                <BrainCircuit size={14} /> <span class="md:hidden lg:inline">Configurado</span>
                                            </span>
                                        {/if}
                                    </td>
                                    
                                    <td class="md:px-6 md:py-4 text-right order-5 md:order-none flex justify-end gap-2 md:table-cell">
                                        <button on:click={() => openModalTopic(true, topic)} class="p-2 bg-surface-100 md:bg-transparent hover:bg-surface-200 dark:bg-surface-700/50 dark:hover:bg-surface-600 rounded-lg text-primary-600" title="Editar">
                                            <Pencil size={16} />
                                        </button>
                                        <button on:click={() => handleDeleteTopic(topic.id)} class="p-2 bg-surface-100 md:bg-transparent hover:bg-surface-200 dark:bg-surface-700/50 dark:hover:bg-surface-600 rounded-lg text-rose-600" title="Apagar">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>

{#if showModal}
    <div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity" transition:fade>
        
        <div class="bg-white dark:bg-surface-900 w-full sm:max-w-lg md:max-w-2xl sm:rounded-xl shadow-2xl border-t sm:border border-surface-200 dark:border-surface-700 flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] animate-slide-up sm:animate-scale rounded-t-2xl">
            
            <div class="shrink-0 px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-800 rounded-t-2xl">
                <h3 class="font-bold text-lg text-surface-900 dark:text-white">
                    {modalMode === 'topic' ? (isEditing ? 'Editar Tópico' : 'Novo Tópico') : 'Nova Disciplina'}
                </h3>
                <button on:click={() => showModal = false} class="p-2 -mr-2 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-full">
                    <X size={20} />
                </button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                
                {#if modalMode === 'discipline'}
                    <label class="block">
                        <span class="text-xs font-bold uppercase text-surface-500">Nome da Disciplina</span>
                        <input type="text" bind:value={formData.nome} class="input w-full mt-1 p-3 rounded-lg border border-surface-300 dark:bg-surface-800 dark:border-surface-600" />
                    </label>
                {:else}
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <label class="block sm:col-span-3">
                            <span class="text-xs font-bold uppercase text-surface-500">Nome do Tópico</span>
                            <input type="text" bind:value={formData.nome} class="input w-full mt-1 p-3 rounded-lg border border-surface-300 dark:bg-surface-800 dark:border-surface-600" placeholder="Ex: Adição Simples" />
                        </label>
                        <label class="block sm:col-span-1">
                            <span class="text-xs font-bold uppercase text-surface-500">Ordem</span>
                            <input type="number" bind:value={formData.ordem} class="input w-full mt-1 p-3 rounded-lg border border-surface-300 dark:bg-surface-800 dark:border-surface-600" />
                        </label>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label class="block">
                            <span class="text-xs font-bold uppercase text-surface-500">Pré-Requisito (ID)</span>
                            <input type="number" bind:value={formData.requisitoId} placeholder="Opcional" class="input w-full mt-1 p-3 rounded-lg border border-surface-300 dark:bg-surface-800 dark:border-surface-600" />
                        </label>
                        <label class="block">
                            <span class="text-xs font-bold uppercase text-surface-500">Descrição Curta (UI)</span>
                            <input type="text" bind:value={metaFields.desc} placeholder="Ex: Aprender a somar..." class="input w-full mt-1 p-3 rounded-lg border border-surface-300 dark:bg-surface-800 dark:border-surface-600" />
                        </label>
                    </div>

                    <div class="border-t border-surface-200 dark:border-surface-700 pt-4">
                        <span class="text-xs font-bold uppercase text-surface-400 mb-4 flex items-center gap-2">
                            <Palette size={14}/> Identidade Visual
                        </span>
                        
                        <div class="flex flex-col gap-6">
                            
                            <div class="space-y-4">
                                <label class="block">
                                    <span class="text-[10px] uppercase text-surface-500 font-bold">Ícone</span>
                                    <div class="relative mt-1">
                                        <select bind:value={metaFields.icon} class="select w-full p-3 pl-10 rounded-lg border border-surface-300 dark:bg-surface-800 dark:border-surface-600 text-sm appearance-none bg-white dark:bg-surface-800">
                                            {#each commonIcons as icon}
                                                <option value={icon}>{icon}</option>
                                            {/each}
                                        </select>
                                        <div class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none">
                                            <svelte:component this={iconMap[metaFields.icon] || Hash} size={18} />
                                        </div>
                                    </div>
                                </label>

                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex-1">
                                        <span class="text-[10px] uppercase text-surface-500 font-bold block mb-2">Cor</span>
                                        <div class="flex flex-wrap gap-2">
                                            {#each colors as c}
                                                <button 
                                                    type="button"
                                                    on:click={() => metaFields.color = c.val}
                                                    class="w-8 h-8 rounded-full shadow-sm transition-all {c.val} {metaFields.color === c.val ? 'ring-2 ring-surface-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-surface-900 scale-110' : ''}"
                                                ></button>
                                            {/each}
                                        </div>
                                    </div>
                                    
                                    <div class="shrink-0 flex flex-col items-center">
                                        <span class="text-[10px] uppercase text-surface-500 font-bold block mb-1">Preview</span>
                                        <div class="w-16 h-16 rounded-xl {metaFields.color} flex items-center justify-center text-white shadow-md">
                                            <svelte:component this={iconMap[metaFields.icon] || Hash} size={24} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <label class="block bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-800/30">
                        <span class="text-xs font-bold uppercase text-purple-700 dark:text-purple-400 flex items-center gap-2 mb-1">
                            <BrainCircuit size={14} /> Regras IA
                        </span>
                        <textarea 
                            bind:value={metaFields.ai_rules} 
                            rows="3"
                            class="textarea w-full p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-surface-900 text-sm focus:ring-purple-500"
                            placeholder="Instruções para a IA..."
                        ></textarea>
                    </label>
                {/if}
            </div>

            <div class="shrink-0 p-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 rounded-b-xl flex justify-end gap-3 pb-8 sm:pb-4">
                <button on:click={() => showModal = false} class="px-5 py-2.5 text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-sm font-medium transition-colors">
                    Cancelar
                </button>
                <button on:click={handleSubmit} class="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-bold shadow-md active:scale-95 transition-transform">
                    Salvar Tópico
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.3); border-radius: 20px; }
</style>