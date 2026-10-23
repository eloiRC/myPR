<script setup lang="ts">
// Interruptor físico: ámbar = encendido (estado vivo), pista n4 = apagado.
defineProps<{ modelValue: boolean; label: string; hint?: string; id: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();
</script>

<template>
  <div class="sw-row">
    <div class="sw-text">
      <span :id="id + '-l'" class="sw-label">{{ label }}</span>
      <span v-if="hint" :id="id + '-h'" class="sw-hint">{{ hint }}</span>
    </div>
    <button :id="id" type="button" role="switch" class="sw" :aria-checked="modelValue"
      :aria-labelledby="id + '-l'" :aria-describedby="hint ? id + '-h' : undefined"
      @click="emit('update:modelValue', !modelValue)">
      <span class="sw-state" aria-hidden="true">{{ modelValue ? 'ON' : 'OFF' }}</span>
      <span class="sw-track" aria-hidden="true"><span class="sw-knob"></span></span>
    </button>
  </div>
</template>

<style scoped>
.sw-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: var(--touch-min); }
.sw-text { display: flex; flex-direction: column; min-width: 0; }
.sw-label { font-size: 1rem; font-weight: 600; color: var(--n8); }
.sw-hint { font-size: 0.8125rem; color: var(--n6); }
.sw {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 0.5rem;
  min-height: var(--touch-min); min-width: var(--touch-min); padding: 0 0 0 0.25rem;
  background: none; border: 0; cursor: pointer; color: var(--n6);
}
.sw-state { font-family: var(--font-display); font-size: 0.8rem; font-weight: 700; letter-spacing: 0.12em; }
.sw[aria-checked='true'] .sw-state { color: var(--led-amber); }
.sw-track {
  position: relative; width: 48px; height: 26px; border-radius: var(--radius-md);
  background: var(--n4); border: 1px solid var(--n5); box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
  transition: background 0.15s ease, border-color 0.15s ease;
}
.sw-knob {
  position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: var(--radius-sm);
  background: var(--n7); box-shadow: var(--bevel); transition: transform 0.15s ease, background 0.15s ease;
}
.sw[aria-checked='true'] .sw-track { background: var(--led-amber); border-color: var(--led-amber); }
.sw[aria-checked='true'] .sw-knob { transform: translateX(22px); background: var(--n0); }
.sw:focus-visible { outline: 2px solid var(--led-amber); outline-offset: 2px; border-radius: var(--radius-md); }
@media (prefers-reduced-motion: reduce) { .sw-track, .sw-knob { transition: none; } }
</style>
