<script setup lang="ts">
// Formulario único de serie: lo usan «Nueva serie», la edición en lista y la edición en tarjeta.
import { ref, computed, watch } from 'vue';
import BuscadorSelect from './BuscadorSelect.vue';
import { formatKgInput } from '../utils/pesoFormula';
import { DURACIONES_PRESET, DURACION_MIN_SEG, DURACION_MAX_SEG, descansoAceptable, textoDescanso } from '../composables/useRestTimer';
import { parseKgEscrito, resolverKgAlSalir, sumarKg, sumarReps, PASO_KG, PASO_REPS } from '../utils/kgInput';

// Contador a nivel de módulo: ids únicos por instancia para que cada <label for> apunte a su input
let contadorInstancias = 0;

interface Props {
  mode: 'crear' | 'editar';
  ejercicioId: number;
  kg: number;
  reps: number;
  ejercicios: any[];
  ultimaSerie?: { Kg: number; Reps: number } | null;
  /** Descanso propio de la serie (s); null/undefined = usa el del ejercicio */
  descansoSeg?: number | null;
  saving?: boolean;
  /** Error del servidor (p. ej. fallo al guardar), se muestra dentro del formulario */
  error?: string;
}

const props = withDefaults(defineProps<Props>(), { ultimaSerie: null, descansoSeg: null, saving: false, error: '' });

const emit = defineEmits<{
  (e: 'submit', valores: { ejercicioId: number; kg: number; reps: number; descansoSeg: number | null }): void;
  (e: 'cancel'): void;
  (e: 'openModalEjercicio'): void;
  (e: 'ejercicioChange', id: number): void;
}>();

const uid = `serie-form-${++contadorInstancias}`;

const ejercicioIdLocal = ref(props.ejercicioId);
const kgLocal = ref(props.kg);
const repsLocal = ref(props.reps);
const errorLocal = ref('');
// Descanso opcional (null = el del ejercicio). Se guarda como texto para admitir el campo vacío.
const descansoLocal = ref<number | null>(props.descansoSeg ?? null);
watch(() => props.descansoSeg, v => { descansoLocal.value = v ?? null; });

// Si el padre cambia los valores iniciales (prefill, ejercicio recién creado...) los reflejamos
watch(() => props.ejercicioId, v => { ejercicioIdLocal.value = v; });
watch(() => props.kg, v => { kgLocal.value = v; });
watch(() => props.reps, v => { repsLocal.value = v; });

watch(ejercicioIdLocal, (v) => {
  if (v !== props.ejercicioId) emit('ejercicioChange', v);
});

const textos = computed(() => props.mode === 'crear'
  ? { titulo: 'Nueva serie', guardar: 'Guardar serie', guardando: 'Guardando…' }
  : { titulo: 'Editar serie', guardar: 'Guardar cambios', guardando: 'Guardando…' });

const cargaCalculada = computed(() => kgLocal.value * repsLocal.value);
const mensajeError = computed(() => errorLocal.value || props.error);

const ajustarKg = (delta: number) => { kgLocal.value = sumarKg(kgLocal.value, delta); errorLocal.value = ''; };
const ajustarReps = (delta: number) => { repsLocal.value = sumarReps(repsLocal.value, delta); errorLocal.value = ''; };

const onKgInput = (e: Event) => {
  const num = parseKgEscrito((e.target as HTMLInputElement).value);
  if (num !== null) kgLocal.value = num;
  errorLocal.value = '';
};

const onKgBlur = (e: Event) => {
  const el = e.target as HTMLInputElement;
  const res = resolverKgAlSalir(el.value, kgLocal.value);
  if (res.tipo === 'formula') {
    kgLocal.value = res.valor;
    el.value = res.texto;
  } else if (res.tipo === 'invalida') {
    el.value = res.texto;
    errorLocal.value = 'Fórmula inválida. Ejemplo: =10x2+25';
  }
};

const descansoDelEjercicio = computed(() => {
  const ej = props.ejercicios.find((e: any) => e.ExerciciId === ejercicioIdLocal.value);
  return ej?.DescansoSeg ?? null;
});
const placeholderDescanso = computed(() => descansoDelEjercicio.value ? `${descansoDelEjercicio.value} s (ejercicio)` : 'Global');
const resumenDescanso = computed(() => descansoLocal.value !== null ? `⏱ ${textoDescanso(descansoLocal.value)}` : '');

const elegirDescanso = (seg: number) => { descansoLocal.value = descansoLocal.value === seg ? null : seg; errorLocal.value = ''; };
const onDescansoInput = (e: Event) => {
  const raw = (e.target as HTMLInputElement).value.trim();
  descansoLocal.value = raw === '' ? null : Math.round(Number(raw));
  errorLocal.value = '';
};

const onRepsInput = (e: Event) => {
  const n = parseInt((e.target as HTMLInputElement).value, 10);
  repsLocal.value = isNaN(n) ? 0 : n;
  errorLocal.value = '';
};

const enviar = () => {
  if (props.saving) return;
  if (!ejercicioIdLocal.value || kgLocal.value <= 0 || repsLocal.value <= 0) {
    errorLocal.value = 'Completa todos los campos correctamente (mínimo 0.5kg)';
    return;
  }
  const d = descansoLocal.value;
  if (!descansoAceptable(d)) {
    errorLocal.value = `El descanso debe ser 0 (sin descanso) o estar entre ${DURACION_MIN_SEG} y ${DURACION_MAX_SEG} s`;
    return;
  }
  errorLocal.value = '';
  emit('submit', { ejercicioId: ejercicioIdLocal.value, kg: kgLocal.value, reps: repsLocal.value, descansoSeg: d });
};
</script>

<template>
  <form class="serie-form" :class="`serie-form--${mode}`" @submit.prevent="enviar" @click.stop>
    <h3 class="serie-form-title">{{ textos.titulo }}</h3>
    <div class="form-group">
      <span class="form-label" :id="`${uid}-ej-label`">Ejercicio</span>
      <div class="input-with-button">
        <BuscadorSelect v-model="ejercicioIdLocal" :options="ejercicios" label="Nom" :reduce="(e: any) => e.ExerciciId" placeholder="Busca un ejercicio..." />
        <button type="button" class="btn btn-secondary ejercicio-btn" @click="emit('openModalEjercicio')" aria-label="Crear ejercicio nuevo" title="Crear ejercicio nuevo">+</button>
      </div>
    </div>
    <p v-if="ultimaSerie" class="last-set-hint">
      Última serie: <strong>{{ ultimaSerie.Kg }} kg × {{ ultimaSerie.Reps }}</strong>
    </p>
    <div class="form-row steppers">
      <div class="form-group">
        <label :for="`${uid}-kg`">Peso (kg)</label>
        <div class="stepper">
          <button type="button" @click="ajustarKg(-PASO_KG)" aria-label="Restar 2,5 kg">−</button>
          <input :id="`${uid}-kg`" type="text" inputmode="decimal" :value="formatKgInput(kgLocal)" @input="onKgInput" @blur="onKgBlur" class="form-control" title="Admite fórmulas, p. ej. =20x2+20">
          <button type="button" @click="ajustarKg(PASO_KG)" aria-label="Sumar 2,5 kg">+</button>
        </div>
      </div>
      <div class="form-group">
        <label :for="`${uid}-reps`">Reps</label>
        <div class="stepper">
          <button type="button" @click="ajustarReps(-PASO_REPS)" aria-label="Restar una repetición">−</button>
          <input :id="`${uid}-reps`" type="number" inputmode="numeric" :value="repsLocal || ''" @input="onRepsInput" class="form-control" min="1" step="1">
          <button type="button" @click="ajustarReps(PASO_REPS)" aria-label="Sumar una repetición">+</button>
        </div>
      </div>
    </div>
    <div class="form-group" v-if="kgLocal > 0 && repsLocal > 0"><div class="carga-calculada"><span class="label">Total:</span><span class="value">{{ cargaCalculada }} kg</span></div></div>
    <details class="mas-opciones">
      <summary>Más opciones<span v-if="resumenDescanso" class="mas-opciones-resumen">{{ resumenDescanso }}</span></summary>
      <div class="form-group descanso-group">
        <label :for="`${uid}-descanso`">Descanso (s)</label>
        <div class="descanso-presets" role="group" aria-label="Descansos habituales">
          <button type="button" class="descanso-chip" :class="{ active: descansoLocal === 0 }" :aria-pressed="descansoLocal === 0" @click="elegirDescanso(0)">Sin descanso</button>
          <button v-for="d in DURACIONES_PRESET" :key="d" type="button" class="descanso-chip" :class="{ active: descansoLocal === d }" :aria-pressed="descansoLocal === d" @click="elegirDescanso(d)">{{ d }}</button>
        </div>
        <div class="descanso-custom">
          <input :id="`${uid}-descanso`" type="number" inputmode="numeric" class="form-control" min="0" :max="DURACION_MAX_SEG" step="5" :value="descansoLocal ?? ''" :placeholder="placeholderDescanso" @input="onDescansoInput">
          <button type="button" class="btn-link-sutil" :disabled="descansoLocal === null" @click="descansoLocal = null">Usar el del ejercicio</button>
        </div>
      </div>
    </details>
    <p v-if="mensajeError" class="serie-form-error" role="alert">{{ mensajeError }}</p>
    <div class="nueva-serie-actions">
      <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? textos.guardando : textos.guardar }}</button>
      <button type="button" @click="emit('cancel')" class="btn btn-secondary">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.mas-opciones { margin: 0.5rem 0 0; }
.mas-opciones > summary {
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--text-muted);
  list-style: none;
  padding: 0.25rem 0;
  user-select: none;
}
.mas-opciones > summary::-webkit-details-marker { display: none; }
.mas-opciones > summary::before { content: '+ '; }
.mas-opciones[open] > summary::before { content: '− '; }
.mas-opciones-resumen { margin-left: 0.5rem; }
.descanso-group { margin-top: 0.25rem; }
.descanso-presets { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
.descanso-chip {
  min-height: 2.25rem;
  padding: 0 0.85rem;
  border-radius: var(--radius-full, 999px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
}
.descanso-chip.active {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: rgba(20, 184, 166, 0.1);
}
.descanso-custom { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.descanso-custom input.form-control { width: 9rem; }
.btn-link-sutil {
  background: none;
  border: 0;
  padding: 0.5rem 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
}
.btn-link-sutil:disabled { opacity: 0.4; cursor: default; text-decoration: none; }
</style>
