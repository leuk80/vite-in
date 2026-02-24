<script lang="ts">
import favicon from '$lib/assets/favicon.svg';
import { ParaglideJS } from '@inlang/paraglide-sveltekit'
import { i18n } from '$lib/i18n'

let { children } = $props();
</script>

<svelte:head>
<link rel="icon" href={favicon} />
</svelte:head>

<ParaglideJS {i18n}>
  {@render children()}
</ParaglideJS>