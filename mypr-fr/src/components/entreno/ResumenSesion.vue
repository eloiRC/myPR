<script setup lang="ts">
// Contenido de la hoja «Terminar entreno»: el marcador final de la sesión.
import SegDisplay from '../SegDisplay.vue';
import JudgeLights from '../JudgeLights.vue';
import { formatoSesion, type ResumenSesion } from '../../utils/entreno';

defineProps<{ resumen: ResumenSesion }>();
</script>

<template>
  <div class="resumen">
    <div class="principal">
      <span class="rotulo">Volumen</span>
      <span class="volumen">
        <SegDisplay :value="resumen.volumenT" tone="amber" :label="`${String(resumen.volumenT).replace('.', ',')} toneladas`" class="seg-volumen" />
        <span class="unidad">t</span>
      </span>
    </div>

    <dl class="celdas">
      <div class="celda">
        <dt class="rotulo">Series</dt>
        <dd><span class="num">{{ resumen.hechas }}</span><span class="de">/ {{ resumen.total }}</span></dd>
      </div>
      <div class="celda">
        <dt class="rotulo">Ejercicios</dt>
        <dd><span class="num">{{ resumen.ejercicios }}</span></dd>
      </div>
      <div class="celda">
        <dt class="rotulo">Tiempo</dt>
        <dd><span class="num">{{ formatoSesion(resumen.duracionSeg) }}</span></dd>
      </div>
      <div class="celda">
        <dt class="rotulo">Récords</dt>
        <dd>
          <span class="num">{{ resumen.prs }}</span>
          <JudgeLights :lit="resumen.prs > 0 ? 3 : 0" size="sm" :label="resumen.prs > 0 ? 'Récords personales conseguidos' : 'Sin récords'" />
        </dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.principal {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.9rem 1rem 1rem;
  background: var(--n0);
  border: 1px solid var(--n3);
  border-radius: var(--radius-md);
}
.rotulo {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--n6);
}
.volumen { display: flex; align-items: flex-end; gap: 0.6rem; }
.seg-volumen { font-size: 3.6rem; }
.unidad { font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; color: var(--n6); line-height: 1; padding-bottom: 0.15rem; }

.celdas { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 0.75rem 0 0; }
.celda { margin: 0; padding: 0.6rem 0.8rem; background: var(--n2); border: 1px solid var(--n3); border-radius: var(--radius-md); }
.celda dd { margin: 0.15rem 0 0; display: flex; align-items: baseline; gap: 0.5rem; }
.num { font-family: var(--font-display); font-size: 2rem; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; color: var(--n8); }
.de { font-family: var(--font-display); font-size: 1.2rem; color: var(--n6); font-variant-numeric: tabular-nums; }
</style>
