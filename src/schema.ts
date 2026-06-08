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

export const updateUser = z.object({
  chatbotPrompt: z.string().max(1000).optional()
})

export const getUser = z.object({})

export const garminCredentialsSave = z.object({
  garminEmail: z.string().email(),
  garminPassword: z.string().min(1)
})

export const garminCredentialsDelete = z.object({})

export const garminRecovery = z.object({
  userId: z.number(),
  data: z.number(),
  sleepHores: z.number().optional(),
  sleepScore: z.number().optional(),
  sleepDeep: z.number().optional(),
  sleepLight: z.number().optional(),
  sleepREM: z.number().optional(),
  hrv: z.number().optional(),
  hrvLastNight: z.number().optional(),
  recoveryHours: z.number().optional(),
  restingHR: z.number().optional(),
  passos: z.number().optional(),
  stress: z.number().optional(),
  bodyBattery: z.number().optional(),
  bodyBatteryDrained: z.number().optional(),
  trainingReadiness: z.number().optional(),
  calories: z.number().optional(),
  activeCalories: z.number().optional(),
  intensityMinutes: z.number().optional(),
  maxHR: z.number().optional(),
  minHR: z.number().optional(),
  vo2Max: z.number().optional(),
  respirationRate: z.number().optional(),
  spo2: z.number().optional()
})

export const garminActivity = z.object({
  userId: z.number(),
  garminActivityId: z.string(),
  data: z.number(),
  tipus: z.string(),
  nom: z.string().optional(),
  distancia: z.number().optional(),
  durada: z.number().optional(),
  avgHR: z.number().optional(),
  maxHR: z.number().optional(),
  avgSpeed: z.number().optional(),
  maxSpeed: z.number().optional(),
  desnivelPos: z.number().optional(),
  desnivelNeg: z.number().optional(),
  minElevation: z.number().optional(),
  maxElevation: z.number().optional(),
  tss: z.number().optional(),
  esforc: z.number().optional(),
  anaerobicEsforc: z.number().optional(),
  calories: z.number().optional(),
  avgPower: z.number().optional(),
  maxPower: z.number().optional(),
  vo2MaxValue: z.number().optional(),
  avgCadence: z.number().optional(),
  avgStrideLength: z.number().optional()
})

export const toggleSerieCompletada = z.object({
  serieId: z.number().min(1),
  completada: z.boolean()
})

export const chatStatus = z.object({
  jobId: z.string()
})

export const chatGPT = z.object({
  message: z.string().min(1),
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
  chatId: z.string().nullish()
})
