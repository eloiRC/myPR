import { ref, readonly } from 'vue';

export const DESHACER_MS = 6000;

interface Pendiente {
  mensaje: string;
  revertir: () => void;
  confirmar: () => Promise<void>;
  timer: ReturnType<typeof setTimeout>;
}

const actual = ref<{ mensaje: string } | null>(null);
let pendiente: Pendiente | null = null;

async function ejecutar(p: Pendiente) {
  try {
    await p.confirmar();
  } catch (err) {
    console.error('No se pudo completar el borrado', err);
    p.revertir();
  }
}

/** Confirma ya el borrado pendiente (si lo hay), sin esperar al temporizador. */
export function confirmarPendiente() {
  if (!pendiente) return;
  const p = pendiente;
  pendiente = null;
  actual.value = null;
  clearTimeout(p.timer);
  void ejecutar(p);
}

/**
 * Borra "con red": `aplicar` quita el elemento de la pantalla al instante y el borrado real
 * (`confirmar`) se retrasa unos segundos para poder deshacerlo. Si falla, se llama a `revertir`.
 */
export function eliminarConDeshacer(opts: {
  mensaje: string;
  aplicar: () => void;
  revertir: () => void;
  confirmar: () => Promise<void>;
}) {
  confirmarPendiente();
  opts.aplicar();
  const p: Pendiente = {
    mensaje: opts.mensaje,
    revertir: opts.revertir,
    confirmar: opts.confirmar,
    timer: setTimeout(confirmarPendiente, DESHACER_MS),
  };
  pendiente = p;
  actual.value = { mensaje: opts.mensaje };
}

export function deshacerPendiente() {
  if (!pendiente) return;
  const p = pendiente;
  pendiente = null;
  actual.value = null;
  clearTimeout(p.timer);
  p.revertir();
}

if (typeof window !== 'undefined') {
  // Si se cierra o recarga la pestaña, el borrado pendiente se confirma en lugar de perderse
  window.addEventListener('pagehide', confirmarPendiente);
}

export function useDeshacer() {
  return { actual: readonly(actual), deshacer: deshacerPendiente };
}
