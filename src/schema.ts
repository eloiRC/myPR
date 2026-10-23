import { z } from 'zod'

const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Za-z]/, 'Debe contener al menos una letra')
  .regex(/\d/, 'Debe contener al menos un número');

export const login = z.object({
  email: z.string().email(),
  password: passwordSchema
});

export const signup = z.object({
  email: z.string().email(),
  password: passwordSchema
})

export const petition = z.object({})

export const getGrupsMusculars = z.object({})

export const nouExercici = z.object({
  nom: z.string().min(3),
  grupsMusculars: z.number().int().positive().array().min(1).max(5)
})

export const editExercici = z.object({
  exerciciId: z.number().min(1),
  nom: z.string().min(3),
  grupsMusculars: z.number().int().positive().array().min(1).max(5)
})

export const getEntreno = z.object({
  entrenoId: z.number().min(0)
})

export const getEntrenos = z.object({
  dataInici: z.number().min(1704294132).max(2529450460),
  dataFi: z.number().min(1704294132).max(2529450460)
}).refine(data => data.dataInici < data.dataFi, {
  message: "la fecha de fin es mas pequeña que la de inicio"
})

export const nouEntreno = z.object({
  nom: z.string().min(1),
  descripcio: z.string().optional(),
  puntuacio: z.number().min(1).max(5).optional()
})

export const editEntreno = z.object({
  entrenoId: z.number().min(1),
  nom: z.string().min(1).optional(),
  descripcio: z.string().optional(),
  puntuacio: z.number().min(1).max(5).optional()
})

export const novaSerie = z.object({
  entrenoId: z.number().min(1),
  exerciciId: z.number().min(1),
  kg: z.number().positive().max(1000),
  reps: z.number().int().positive().max(1000)
})

export const editSerie = z.object({
  serieId: z.number().min(1),
  entrenoId: z.number().min(1),
  exerciciId: z.number().min(1),
  kg: z.number().positive().max(1000),
  reps: z.number().int().positive().max(1000)
})

export const deleteSerie = z.object({
  serieId: z.number().min(1)
})

export const deleteEntreno = z.object({
  entrenoId: z.number().min(1)
})

export const getExercici = z.object({
  exerciciId: z.number().min(1)
})

export const getPesosHistorial = z.object({
  exerciciId: z.number().min(1)
})

export const getCargaHistorial = z.object({
  exerciciId: z.number().min(1)
})

export const reorderSerie = z.object({
  entrenoId: z.number().min(1),
  serieId: z.number().min(1),
  newIndex: z.number().min(0)
})

export const getUser = z.object({})

export const toggleSerieCompletada = z.object({
  serieId: z.number().min(1),
  completada: z.boolean()
})

export const chatStatus = z.object({
  jobId: z.string()
})

export const chatGPT = z.object({
  message: z.string().min(1),
  requestId: z.string().optional(),
  currentTraining: z.object({
    entreno: z.object({
      EntrenoId: z.number(),
      UserId: z.number(),
      Data: z.number(),
      CargaTotal: z.number(),
      Nom: z.string(),
      Descripcio: z.string().nullish(),
      Puntuacio: z.number().nullish()
    }),
    series: z.array(z.object({
      SerieId: z.number(),
      UserId: z.number(),
      EntrenoId: z.number(),
      ExerciciId: z.number(),
      Kg: z.number(),
      Reps: z.number(),
      Carga: z.number(),
      PR: z.union([z.number(), z.boolean()]),
      Data: z.number()
    })).nullish(),
    ejercicios: z.array(z.object({
      ExerciciId: z.number(),
      Nom: z.string(),
      UserId: z.number(),
      PR: z.union([z.number(), z.boolean()]),
      GrupMuscular1: z.number().nullable(),
      GrupMuscular2: z.number().nullable(),
      GrupMuscular3: z.number().nullable(),
      GrupMuscular4: z.number().nullable(),
      GrupMuscular5: z.number().nullable(),
    })).nullish()
  }),
  previousTrainings: z.array(z.object({
    EntrenoId: z.number(),
    UserId: z.number(),
    Data: z.number(),
    CargaTotal: z.number(),
    Nom: z.string(),
    Descripcio: z.string().nullish(),
    Puntuacio: z.number().nullish(),
    series: z.array(z.object({
      SerieId: z.number(),
      UserId: z.number(),
      EntrenoId: z.number(),
      ExerciciId: z.number(),
      Kg: z.number(),
      Reps: z.number(),
      Carga: z.number(),
      PR: z.union([z.number(), z.boolean()]),
      Data: z.number()
    })).nullish(),
    ejercicios: z.array(z.object({
      ExerciciId: z.number(),
      Nom: z.string(),
      UserId: z.number(),
      PR: z.union([z.number(), z.boolean()]),
      GrupMuscular1: z.number().nullable(),
      GrupMuscular2: z.number().nullable(),
      GrupMuscular3: z.number().nullable(),
      GrupMuscular4: z.number().nullable(),
      GrupMuscular5: z.number().nullable(),
    })).nullish()
  })).nullish(),
  chatId: z.string().nullish(),
  // Historial: formato nuevo { role, content } o antiguo de Gemini { role: 'user'|'model', parts: [{ text }] }
  history: z.array(z.union([
    z.object({ role: z.enum(['user', 'assistant']), content: z.string() }),
    z.object({ role: z.enum(['user', 'model']), parts: z.array(z.object({ text: z.string().optional() }).passthrough()) }),
  ])).nullish()
})

export const memoryList = z.object({})

const memoryKind = z.enum(['lesion', 'objetivo', 'preferencia', 'nota'])

export const memoryCreate = z.object({
  kind: memoryKind,
  text: z.string().trim().min(3).max(500)
})

export const memoryUpdate = z.object({
  memoryId: z.number().int().min(1),
  kind: memoryKind.optional(),
  text: z.string().trim().min(3).max(500).optional(),
  status: z.enum(['activa', 'resuelta']).optional()
}).refine(d => d.text !== undefined || d.status !== undefined || d.kind !== undefined, { message: 'Indica texto, tipo o estado' })

export const memoryDelete = z.object({
  memoryId: z.number().int().min(1)
})
