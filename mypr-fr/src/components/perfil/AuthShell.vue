<script setup lang="ts">
import SegDisplay from '../SegDisplay.vue';

defineProps<{ titulo: string; subtitulo: string }>();
</script>

<template>
  <main class="au">
    <div class="au-col">
      <div class="au-brand">
        <div class="au-mark" aria-hidden="true">
          <SegDisplay value="PR" tone="amber" label="PR" />
        </div>
        <div class="au-word" aria-label="MyPR">MyPR</div>
      </div>

      <h1 class="au-title">{{ titulo }}</h1>
      <p class="au-sub">{{ subtitulo }}</p>

      <slot />
    </div>
  </main>
</template>

<style scoped>
.au {
  min-height: 100vh; min-height: 100dvh; display: flex; justify-content: center; align-items: flex-start;
  padding: 3rem 1.25rem 2rem; background: var(--n0);
}
.au-col { width: 100%; max-width: 24rem; }
.au-brand { display: flex; align-items: center; gap: 0.875rem; margin-bottom: 2rem; }
.au-mark {
  display: grid; place-items: center; padding: 0.5rem 0.75rem; background: var(--n0);
  border: 1px solid var(--n4); border-radius: var(--radius-md); box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  font-size: 1.75rem;
}
.au-word {
  font-family: var(--font-display); font-size: 2.25rem; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--n8); line-height: 1;
}
.au-title {
  margin: 0 0 0.25rem; font-family: var(--font-display); font-size: 1.75rem; font-weight: 700;
  letter-spacing: 0.04em; text-transform: uppercase; color: var(--n8);
}
.au-sub { margin: 0 0 1.5rem; font-size: 1rem; color: var(--n7); }
</style>

<!-- Formulario compartido por Login y Register (el contenido va en el slot, por eso no es scoped) -->
<style>
.au-form { display: flex; flex-direction: column; gap: 1rem; }
.au-form .form-group { margin-bottom: 0; }
.au-form .input { min-height: 48px; font-size: 16px; }
.au-form .input[aria-invalid='true'] { border-color: var(--led-red); }
.au-error {
  margin: 0; padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--led-red);
  background: var(--led-red-dim); color: var(--led-red); font-size: 0.9375rem; font-weight: 600;
}
.au-submit { width: 100%; min-height: 52px; font-size: 1.1rem; margin-top: 0.25rem; }
.au-link {
  display: flex; align-items: center; justify-content: center; min-height: var(--touch-min);
  color: var(--n7); font-size: 1rem; text-decoration: none;
}
.au-link strong { color: var(--n8); text-decoration: underline; text-underline-offset: 3px; margin-left: 0.3em; }
.au-link:hover strong { color: var(--led-amber); }
</style>
