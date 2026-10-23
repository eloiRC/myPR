<script setup lang="ts">
// Formulario único de serie: lo usan «Nueva serie», la edición en lista y la edición en tarjeta.
import { ref, computed, watch } from 'vue';
import BuscadorSelect from './BuscadorSelect.vue';
import { formatKgInput } from '../utils/pesoFormula';
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
  saving?: boolean;
  /** Error del servidor (p. ej. fallo al guardar), se muestra dentro del formulario */
  error?: string;
}

const props = withDefaults(defineProps<Props>(), { ultimaSerie: null, saving: false, error: '' });

const emit = defineEmits<{
  (e: 'submit', valores: { ejercicioId: number; kg: number; reps: number }): void;
  (e: 'cancel'): void;
  (e: 'openModalEjercicio'): void;
  (e: 'ejercicioChange', id: number): void;
}>();

const uid = `serie-form-${++contadorInstancias}`;

const ejercicioIdLocal = ref(props.ejercicioId);
const kgLocal = ref(props.kg);
const repsLocal = ref(props.reps);
const errorLocal = ref('');

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
  errorLocal.value = '';
  emit('submit', { ejercicioId: ejercicioIdLocal.value, kg: kgLocal.value, reps: repsLocal.value });
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
    <p v-if="mensajeError" class="serie-form-error" role="alert">{{ mensajeError }}</p>
    <div class="nueva-serie-actions">
      <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? textos.guardando : textos.guardar }}</button>
      <button type="button" @click="emit('cancel')" class="btn btn-secondary">Cancelar</button>
    </div>
  </form>
</template>
