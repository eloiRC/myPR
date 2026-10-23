<script setup lang="ts">
import { watch, onBeforeUnmount, ref, nextTick } from 'vue';
import { X } from 'lucide-vue-next';

// Hoja inferior: sustituye a los modales. Se cierra con el fondo, Escape o el botón.
interface Props {
  open: boolean;
  title?: string;
  /** 'auto' ajusta al contenido; 'full' ocupa casi toda la pantalla (p. ej. el chat) */
  height?: 'auto' | 'full';
}
const props = withDefaults(defineProps<Props>(), { title: undefined, height: 'auto' });
const emit = defineEmits<{ (e: 'close'): void }>();
const panel = ref<HTMLElement | null>(null);
let previo: HTMLElement | null = null;

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close'); };

watch(() => props.open, async (abierta) => {
  if (abierta) {
    previo = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    await nextTick();
    panel.value?.focus();
  } else {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    previo?.focus?.();
  }
}, { immediate: true });

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-backdrop" @click.self="emit('close')">
        <section
          ref="panel"
          class="sheet"
          :class="`sheet--${height}`"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <header v-if="title || $slots.header" class="sheet-head">
            <span class="sheet-grip" aria-hidden="true"></span>
            <slot name="header"><h2 class="sheet-title">{{ title }}</h2></slot>
            <button type="button" class="sheet-close" aria-label="Cerrar" @click="emit('close')"><X :size="22" /></button>
          </header>
          <div class="sheet-body"><slot /></div>
          <footer v-if="$slots.footer" class="sheet-foot"><slot name="footer" /></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(5, 6, 7, 0.7);
}
.sheet {
  width: 100%;
  max-width: 40rem;
  max-height: calc(100dvh - 2.5rem);
  display: flex;
  flex-direction: column;
  background: var(--n1);
  border: 1px solid var(--n3);
  border-bottom: none;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.5);
  padding-bottom: env(safe-area-inset-bottom);
  outline: none;
}
.sheet--full { height: calc(100dvh - 2.5rem); }
.sheet-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.1rem 0.75rem 0.6rem 1rem;
  border-bottom: 1px solid var(--n3);
}
.sheet-grip {
  position: absolute;
  top: 0.45rem;
  left: 50%;
  width: 2.5rem;
  height: 4px;
  margin-left: -1.25rem;
  border-radius: 2px;
  background: var(--n4);
}
.sheet-title {
  flex: 1;
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.sheet-close {
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  margin-left: auto;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--n7);
  cursor: pointer;
}
.sheet-close:hover { background: var(--n2); color: var(--n8); }
.sheet-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 1rem; }
.sheet-foot { padding: 0.75rem 1rem; border-top: 1px solid var(--n3); }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.2s ease; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: none; }
}
</style>
