<script setup lang="ts">
// Datos del entreno (hoja inferior): resumen, reparto por músculo, fecha, descripción y puntuación.
import { ref, computed } from 'vue';
import { Star } from 'lucide-vue-next';

interface Props {
  entreno: { EntrenoId: number; Data: number; CargaTotal: number; Nom: string; Descripcio: string | null; Puntuacio: number | null };
  series: any[];
  ejercicios: any[];
  gruposMusculares: { GrupMuscularId: number; Nom: string }[];
  /** Guarda descripción y puntuación; debe lanzar si falla */
  guardar: (valores: { descripcio: string; puntuacio: number }) => Promise<void>;
}
const props = defineProps<Props>();

const modoGrafico = ref<'series' | 'reps' | 'carga'>('series');
const editando = ref(false);
const descripcio = ref('');
const puntuacio = ref(3);
const guardando = ref(false);
const error = ref('');

const ejerciciosUnicos = computed(() => new Set(props.series.map(s => s.ExerciciId)).size);
const fecha = computed(() => new Date(props.entreno.Data * 1000).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }));

const musculoStats = computed(() => {
  const stats = new Map<string, { series: number; reps: number; carga: number }>();
  if (!props.ejercicios.length || !props.series.length) return [];
  props.series.forEach(s => {
    const ej = props.ejercicios.find(e => e.ExerciciId === s.ExerciciId);
    if (!ej) return;
    const gmIds = [ej.GrupMuscular1, ej.GrupMuscular2, ej.GrupMuscular3, ej.GrupMuscular4, ej.GrupMuscular5].filter(Boolean) as number[];
    gmIds.forEach(gmId => {
      const grupo = props.gruposMusculares.find(g => g.GrupMuscularId === gmId);
      if (!grupo) return;
      if (!stats.has(grupo.Nom)) stats.set(grupo.Nom, { series: 0, reps: 0, carga: 0 });
      const st = stats.get(grupo.Nom)!;
      st.series++;
      st.reps += s.Reps;
      st.carga += (s.Carga || s.Kg * s.Reps);
    });
  });
  const vals = Array.from(stats.values());
  const maxSeries = Math.max(...vals.map(v => v.series), 1);
  const maxReps = Math.max(...vals.map(v => v.reps), 1);
  const maxCarga = Math.max(...vals.map(v => v.carga), 1);
  const pct = (m: 'series' | 'reps' | 'carga', v: { series: number; reps: number; carga: number }) =>
    Math.round((v[m] / (m === 'series' ? maxSeries : m === 'reps' ? maxReps : maxCarga)) * 100);
  return Array.from(stats.entries())
    .map(([nom, v]) => ({ nom, ...v, pct: pct(modoGrafico.value, v) }))
    .sort((a, b) => b.pct - a.pct);
});

const empezar = () => {
  descripcio.value = props.entreno.Descripcio || '';
  puntuacio.value = props.entreno.Puntuacio || 3;
  error.value = '';
  editando.value = true;
};
const enviar = async () => {
  guardando.value = true;
  error.value = '';
  try {
    await props.guardar({ descripcio: descripcio.value, puntuacio: puntuacio.value });
    editando.value = false;
  } catch (e: any) {
    error.value = e?.message || 'No se pudieron guardar los cambios.';
  } finally {
    guardando.value = false;
  }
};
const MODOS = [['series', 'Series'], ['reps', 'Reps'], ['carga', 'Carga (kg)']] as const;
</script>

<template>
  <div class="datos">
    <div class="resumen">
      <div class="stat"><span class="num">{{ entreno.CargaTotal }}<small> t</small></span><span class="rotulo">Peso total</span></div>
      <div class="stat"><span class="num">{{ series.length }}</span><span class="rotulo">Series</span></div>
      <div class="stat"><span class="num">{{ ejerciciosUnicos }}</span><span class="rotulo">Ejercicios</span></div>
    </div>

    <section v-if="musculoStats.length" class="musculos" aria-label="Reparto por músculo">
      <div class="modos" role="group" aria-label="Medir por">
        <button v-for="[k, t] in MODOS" :key="k" type="button" class="modo" :class="{ activo: modoGrafico === k }" :aria-pressed="modoGrafico === k" @click="modoGrafico = k">{{ t }}</button>
      </div>
      <div v-for="m in musculoStats" :key="m.nom" class="barra-fila">
        <span class="barra-nombre">{{ m.nom }}</span>
        <span class="pista"><span class="relleno" :style="{ width: m.pct + '%' }"></span></span>
        <span class="barra-valor">{{ modoGrafico === 'carga' ? m.carga + ' kg' : m[modoGrafico] }}</span>
      </div>
    </section>

    <section class="info" aria-label="Datos del entreno">
      <template v-if="!editando">
        <div class="fila"><span class="rotulo">Fecha</span><span class="dato">{{ fecha }}</span></div>
        <div class="fila"><span class="rotulo">Descripción</span><span class="dato">{{ entreno.Descripcio || '—' }}</span></div>
        <div class="fila">
          <span class="rotulo">Puntuación</span>
          <span class="dato estrellas" :aria-label="`${entreno.Puntuacio ?? 0} de 5`">
            <Star v-for="i in 5" :key="i" :size="18" :stroke-width="2" :class="{ llena: entreno.Puntuacio && i <= entreno.Puntuacio }" aria-hidden="true" />
          </span>
        </div>
        <button type="button" class="btn btn-secondary editar" @click="empezar">Editar datos</button>
      </template>
      <form v-else class="form" @submit.prevent="enviar">
        <label class="rotulo" for="datos-desc">Descripción</label>
        <textarea id="datos-desc" v-model="descripcio" class="area" rows="3"></textarea>
        <span class="rotulo" id="datos-punt">Puntuación</span>
        <div class="estrellas-edit" role="radiogroup" aria-labelledby="datos-punt">
          <button v-for="i in 5" :key="i" type="button" role="radio" :aria-checked="i === puntuacio" :aria-label="`${i} de 5`" class="estrella" @click="puntuacio = i">
            <Star :size="24" :stroke-width="2" :class="{ llena: i <= puntuacio }" aria-hidden="true" />
          </button>
        </div>
        <p class="nota">El nombre se edita tocándolo en la cabecera.</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="acciones">
          <button type="submit" class="btn btn-primary" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Guardar' }}</button>
          <button type="button" class="btn btn-secondary" @click="editando = false">Cancelar</button>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.datos { display: flex; flex-direction: column; gap: 1.25rem; }
.rotulo {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--n6);
}
.resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
.stat { display: flex; flex-direction: column; gap: 0.1rem; padding: 0.6rem 0.75rem; background: var(--n2); border: 1px solid var(--n3); border-radius: var(--radius-md); }
.num { font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; line-height: 1.05; font-variant-numeric: tabular-nums; }
.num small { font-size: 1rem; color: var(--n6); }

.modos { display: flex; gap: 0.4rem; margin-bottom: 0.75rem; }
.modo {
  min-height: var(--touch-min);
  padding: 0 0.9rem;
  background: transparent;
  color: var(--n7);
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.modo.activo { border-color: var(--led-amber); color: var(--led-amber); background: var(--led-amber-dim); }
.barra-fila { display: grid; grid-template-columns: 6.5rem 1fr 4.5rem; align-items: center; gap: 0.6rem; min-height: 1.9rem; }
.barra-nombre { font-size: 0.9rem; color: var(--n8); text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pista { height: 10px; background: var(--n2); border-radius: 1px; overflow: hidden; }
.relleno { display: block; height: 100%; min-width: 2px; background: var(--n7); }
.barra-valor { font-size: 0.9rem; color: var(--n7); font-variant-numeric: tabular-nums; }

.fila { display: flex; flex-direction: column; gap: 0.1rem; padding: 0.7rem 0; border-bottom: 1px solid var(--n3); }
.dato { color: var(--n8); overflow-wrap: anywhere; }
.estrellas { display: flex; gap: 0.15rem; }
.estrellas svg, .estrella svg { color: var(--n5); }
.estrellas svg.llena, .estrella svg.llena { color: var(--n8); fill: var(--n8); }
.editar { width: 100%; margin-top: 0.75rem; }
.form { display: flex; flex-direction: column; gap: 0.5rem; }
.area {
  width: 100%;
  min-height: 5.5rem;
  padding: 0.6rem 0.75rem;
  background: var(--n0);
  color: var(--n8);
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 1rem;
  resize: vertical;
}
.area:focus { outline: none; border-color: var(--led-amber); box-shadow: 0 0 0 1px var(--led-amber); }
.estrellas-edit { display: flex; gap: 0.25rem; }
.estrella { min-width: var(--touch-min); min-height: var(--touch-min); display: grid; place-items: center; background: none; border: none; border-radius: var(--radius-sm); cursor: pointer; }
.estrella:hover { background: var(--n2); }
.nota { margin: 0; font-size: 0.8rem; color: var(--n6); }
.error { margin: 0; padding: 0.5rem 0.75rem; border: 1px solid var(--led-red); border-radius: var(--radius-sm); background: var(--led-red-dim); color: var(--led-red); font-size: 0.9rem; }
.acciones { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.acciones .btn { flex: 1; }
</style>
