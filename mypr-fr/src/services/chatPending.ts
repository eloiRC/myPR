// Job del coach en curso por entreno: permite retomar el polling si la pantalla se bloquea,
// se cambia de pestaña o se cierra y reabre la app (el backend sigue trabajando en la cola).

export interface PendingChat {
    jobId: string;
    botMessageId: number;
    requestId: string;
    startedAt: number;
}

// Igual que el TTL de los jobs en el backend (24 h): pasado ese tiempo el job ya no existe
export const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export function pendingKey(entrenoId: string | number | undefined): string {
    return `mypr_chat_pending:${entrenoId ?? 'global'}`;
}

/** Valida un valor leído de localStorage; null si no tiene la forma esperada o ha caducado. */
export function parsePending(raw: string | null, now = Date.now()): PendingChat | null {
    if (!raw) return null;
    try {
        const p = JSON.parse(raw);
        if (!p || typeof p.jobId !== 'string' || !p.jobId) return null;
        if (typeof p.botMessageId !== 'number' || typeof p.requestId !== 'string' || typeof p.startedAt !== 'number') return null;
        if (now - p.startedAt > PENDING_TTL_MS) return null;
        return { jobId: p.jobId, botMessageId: p.botMessageId, requestId: p.requestId, startedAt: p.startedAt };
    } catch {
        return null;
    }
}

export function savePending(entrenoId: string | number | undefined, pending: PendingChat): void {
    try {
        localStorage.setItem(pendingKey(entrenoId), JSON.stringify(pending));
    } catch { /* almacenamiento no disponible: simplemente no se podrá retomar */ }
}

export function loadPending(entrenoId: string | number | undefined, now = Date.now()): PendingChat | null {
    try {
        const key = pendingKey(entrenoId);
        const raw = localStorage.getItem(key);
        const pending = parsePending(raw, now);
        // Un registro corrupto o caducado se limpia
        if (raw && !pending) localStorage.removeItem(key);
        return pending;
    } catch {
        return null;
    }
}

export function clearPending(entrenoId: string | number | undefined): void {
    try {
        localStorage.removeItem(pendingKey(entrenoId));
    } catch { /* ignorar */ }
}

/**
 * Guarda de un único bucle de polling. `start` devuelve un token, o null si ya hay un bucle
 * activo (así retomar y enviar nunca hacen polling doble); `isCurrent` permite a un bucle
 * saber si sigue siendo el vigente; `cancel` invalida el bucle activo (p. ej. al desmontar).
 */
export function createPollGuard() {
    let active: number | null = null;
    let counter = 0;
    return {
        start(): number | null {
            if (active !== null) return null;
            active = ++counter;
            return active;
        },
        isCurrent(token: number): boolean {
            return active === token;
        },
        stop(token: number): void {
            if (active === token) active = null;
        },
        cancel(): void {
            active = null;
        },
        get busy(): boolean {
            return active !== null;
        },
    };
}

/** Texto para el usuario cuando el job acaba en error: solo se muestra el del servidor si es un aviso pensado para él. */
export function chatErrorMessage(serverError?: string): string {
    if (serverError && serverError.startsWith('La respuesta se interrumpió')) return `⚠️ ${serverError}`;
    return '⚠️ El entrenador no ha podido responder. Inténtalo de nuevo en unos segundos.';
}
