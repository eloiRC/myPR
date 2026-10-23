<script setup lang="ts">
// Formulario único de serie: lo usan «Nueva serie», la edición en lista y la edición en tarjeta.
import { ref, computed, watch } from 'vue';
import { Plus, Minus, Timer, Trash2 } from 'lucide-vue-next';
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
  /** Muestra la acción «Eliminar serie» (solo al editar) */
  borrable?: boolean;
}

const props = withDefaults(defineProps<Props>(), { ultimaSerie: null, descansoSeg: null, saving: false, error: '', borrable: false });

const emit = defineEmits<{
  (e: 'submit', valores: { ejercicioId: number; kg: number; reps: number; descansoSeg: number | null }): void;
  (e: 'cancel'): void;
  (e: 'delete'): void;
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
const resumenDescanso = computed(() => descansoLocal.value !== null ? textoDescanso(descansoLocal.value) : '');

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
    <div class="campo">
      <span class="rotulo" :id="`${uid}-ej-label`">Ejercicio</span>
      <div class="ej-fila">
        <BuscadorSelect v-model="ejercicioIdLocal" :options="ejercicios" label="Nom" :reduce="(e: any) => e.ExerciciId" placeholder="Busca un ejercicio..." />
        <button type="button" class="btn-cuadrado" @click="emit('openModalEjercicio')" aria-label="Crear ejercicio nuevo" title="Crear ejercicio nuevo"><Plus :size="20" :stroke-width="2.25" /></button>
      </div>
    </div>
    <p v-if="ultimaSerie" class="ultima">
      Última serie <strong>{{ ultimaSerie.Kg }} kg × {{ ultimaSerie.Reps }}</strong>
    </p>
    <div class="steppers">
      <div class="campo">
        <label class="rotulo" :for="`${uid}-kg`">Peso (kg)</label>
        <div class="stepper">
          <button type="button" @click="ajustarKg(-PASO_KG)" aria-label="Restar 2,5 kg"><Minus :size="20" :stroke-width="2.5" /></button>
          <input :id="`${uid}-kg`" type="text" inputmode="decimal" :value="formatKgInput(kgLocal)" @input="onKgInput" @blur="onKgBlur" title="Admite fórmulas, p. ej. =20x2+20">
          <button type="button" @click="ajustarKg(PASO_KG)" aria-label="Sumar 2,5 kg"><Plus :size="20" :stroke-width="2.5" /></button>
        </div>
      </div>
      <div class="campo">
        <label class="rotulo" :for="`${uid}-reps`">Reps</label>
        <div class="stepper">
          <button type="button" @click="ajustarReps(-PASO_REPS)" aria-label="Restar una repetición"><Minus :size="20" :stroke-width="2.5" /></button>
          <input :id="`${uid}-reps`" type="number" inputmode="numeric" :value="repsLocal || ''" @input="onRepsInput" min="1" step="1">
          <button type="button" @click="ajustarReps(PASO_REPS)" aria-label="Sumar una repetición"><Plus :size="20" :stroke-width="2.5" /></button>
        </div>
      </div>
    </div>
    <div v-if="kgLocal > 0 && repsLocal > 0" class="total"><span class="rotulo">Total</span><span class="total-valor">{{ cargaCalculada }} kg</span></div>
    <details class="mas-opciones">
      <summary>Más opciones<span v-if="resumenDescanso" class="mas-opciones-resumen"><Timer :size="13" :stroke-width="2" />{{ resumenDescanso }}</span></summary>
      <div class="campo descanso-group">
        <label class="rotulo" :for="`${uid}-descanso`">Descanso (s)</label>
        <div class="descanso-presets" role="group" aria-label="Descansos habituales">
          <button type="button" class="descanso-chip" :class="{ active: descansoLocal === 0 }" :aria-pressed="descansoLocal === 0" @click="elegirDescanso(0)">Sin descanso</button>
          <button v-for="d in DURACIONES_PRESET" :key="d" type="button" class="descanso-chip" :class="{ active: descansoLocal === d }" :aria-pressed="descansoLocal === d" @click="elegirDescanso(d)">{{ d }}</button>
        </div>
        <div class="descanso-custom">
          <input :id="`${uid}-descanso`" type="number" inputmode="numeric" class="descanso-input" min="0" :max="DURACION_MAX_SEG" step="5" :value="descansoLocal ?? ''" :placeholder="placeholderDescanso" @input="onDescansoInput">
          <button type="button" class="btn-link-sutil" :disabled="descansoLocal === null" @click="descansoLocal = null">Usar el del ejercicio</button>
        </div>
      </div>
    </details>
    <p v-if="mensajeError" class="serie-form-error" role="alert">{{ mensajeError }}</p>
    <div class="acciones">
      <button type="submit" class="btn btn-primary btn-guardar" :disabled="saving">{{ saving ? textos.guardando : textos.guardar }}</button>
      <button type="button" @click="emit('cancel')" class="btn btn-secondary">Cancelar</button>
      <button v-if="borrable && mode === 'editar'" type="button" class="btn btn-quiet-danger borrar" :disabled="saving" @click="emit('delete')"><Trash2 :size="18" :stroke-width="2" aria-hidden="true" />Eliminar serie</button>
    </div>
  </form>
</template>

<style scoped>
.serie-form { display: flex; flex-direction: column; gap: 1rem; width: 100%; }
.campo { display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
.rotulo {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--n6);
}
.ej-fila { display: flex; align-items: stretch; gap: 0.5rem; width: 100%; }
.ej-fila > :first-child { flex: 1; min-width: 0; }
.btn-cuadrado {
  flex: 0 0 var(--touch-min);
  min-height: var(--touch-min);
  display: grid;
  place-items: center;
  background: var(--n1);
  color: var(--n8);
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.btn-cuadrado:hover { background: var(--n2); border-color: var(--n5); }

.ultima { margin: -0.25rem 0 0; font-size: 0.85rem; color: var(--n7); }
.ultima strong { color: var(--n8); font-variant-numeric: tabular-nums; }

.steppers { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.stepper {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
  align-items: stretch;
  border: 1px solid var(--n4);
  border-radius: var(--radius-md);
  background: var(--n0);
  overflow: hidden;
}
.stepper:focus-within { border-color: var(--led-amber); box-shadow: 0 0 0 1px var(--led-amber); }
.stepper button {
  min-height: 3.5rem;
  display: grid;
  place-items: center;
  border: none;
  background: var(--n2);
  color: var(--n8);
  cursor: pointer;
  touch-action: manipulation;
}
.stepper button:active { background: var(--n4); }
.stepper input {
  min-width: 0;
  width: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--n8);
  text-align: center;
  font-family: var(--font-sans);
  font-size: 1.5rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 0.25rem;
}
.stepper input:focus,
.stepper input:focus-visible { outline: none; box-shadow: none; }

.total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.6rem 0.75rem;
  background: var(--n0);
  border: 1px solid var(--n3);
  border-radius: var(--radius-sm);
}
.total-valor { font-size: 1.15rem; font-weight: 600; font-variant-numeric: tabular-nums; }

.mas-opciones > summary {
  min-height: var(--touch-min);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--n7);
  list-style: none;
  user-select: none;
}
.mas-opciones > summary::-webkit-details-marker { display: none; }
.mas-opciones > summary::before { content: '+'; width: 1ch; }
.mas-opciones[open] > summary::before { content: '−'; }
.mas-opciones-resumen { display: inline-flex; align-items: center; gap: 0.25rem; margin-left: 0.5rem; color: var(--n8); letter-spacing: 0; }
.descanso-presets { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.descanso-chip {
  min-height: var(--touch-min);
  padding: 0 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--n4);
  background: transparent;
  color: var(--n7);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
}
.descanso-chip.active { border-color: var(--led-amber); color: var(--led-amber); background: var(--led-amber-dim); }
.descanso-custom { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.descanso-input {
  width: 9rem;
  min-height: var(--touch-min);
  padding: 0 0.75rem;
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  background: var(--n0);
  color: var(--n8);
  font: inherit;
  font-variant-numeric: tabular-nums;
}
.descanso-input:focus { outline: none; border-color: var(--led-amber); box-shadow: 0 0 0 1px var(--led-amber); }
.btn-link-sutil {
  min-height: var(--touch-min);
  background: none;
  border: 0;
  padding: 0 0.25rem;
  color: var(--n7);
  font-size: 0.85rem;
  text-decoration: underline;
  cursor: pointer;
}
.btn-link-sutil:disabled { opacity: 0.4; cursor: default; text-decoration: none; }

.serie-form-error {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--led-red);
  background: var(--led-red-dim);
  color: var(--led-red);
  font-size: 0.9rem;
}

.acciones { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.25rem; }
.acciones .btn { width: 100%; }
.btn-guardar { min-height: 3.5rem; font-size: 1.15rem; }
.borrar { margin-top: 0.25rem; }
</style>
