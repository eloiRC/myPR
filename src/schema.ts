import { z } from 'zod'
import { nullable, string } from 'zod/v4';

export const login = z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, { message: "Minimum eight characters, at least one letter and one number " })
});

export const signup = z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, { message: "Minimum eight characters, at least one letter and one number " })

})

export const petition = z.object({
    token: z.string().min(10)
})

export const getGrupsMusculars = z.object({
    token: z.string().min(10)
})

export const nouExercici = z.object({
    token: z.string().min(10),
    nom: z.string().min(3),
    grupsMusculars: z.number().array().min(1).max(5)
})

export const editExercici = z.object({
    token: z.string().min(10),
    exerciciId: z.number().min(1),
    nom: z.string().min(3),
    grupsMusculars: z.number().array().min(1).max(5)
})

export const getEntreno = z.object({
    token: z.string().min(10),
    entrenoId: z.number().min(0)
})

export const getEntrenos = z.object({
    token: z.string().min(10),
    dataInici: z.number().min(1704294132).max(2529450460),
    dataFi: z.number().min(1704294132).max(2529450460)
}).refine(data => data.dataInici < data.dataFi, {
    message: "la fecha de fin es mas pequna que la de inicio"
})

export const nouEntreno = z.object({
    token: z.string().min(10),
    nom: z.string().min(1),
    descripcio: z.string().optional(),
    puntuacio: z.number().min(1).max(5).optional()
})

export const editEntreno = z.object({
    token: z.string().min(10),
    entrenoId: z.number().min(1),
    nom: z.string().min(1),
    descripcio: z.string().optional(),
    puntuacio: z.number().min(1).max(5).optional()
})

export const novaSerie = z.object({
    token: z.string().min(10),
    entrenoId: z.number().min(1),
    exerciciId: z.number().min(1),
    kg: z.number().min(0),
    reps: z.number().min(1)
})

export const editSerie = z.object({
    token: z.string().min(10),
    serieId: z.number().min(1),
    entrenoId: z.number().min(1),
    exerciciId: z.number().min(1),
    kg: z.number().min(0),
    reps: z.number().min(1)
})

export const deleteSerie = z.object({
    token: z.string().min(10),
    serieId: z.number().min(1)
})

export const deleteEntreno = z.object({
    token: z.string().min(10),
    entrenoId: z.number().min(1)
})

export const getExercici = z.object({
    token: z.string().min(10),
    exerciciId: z.number().min(1)
})

export const getPesosHistorial = z.object({
    token: z.string().min(10),
    exerciciId: z.number().min(1)
})

export const getCargaHistorial = z.object({
    token: z.string().min(10),
    exerciciId: z.number().min(1)
})

export const reorderSerie = z.object({
    token: z.string().min(10),
    entrenoId: z.number().min(1),
    serieId: z.number().min(1),
    newIndex: z.number().min(0)
})

export const chatGPT = z.object({
    token: z.string().min(10),
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
            PR: z.union([z.number(), z.boolean()]), // PR puede ser number o boolean
            Data: z.number()
        })).nullish(),
        ejercicios: z.array(z.object({
            ExerciciId: z.number(),
            Nom: z.string(),
            UserId: z.number(),
            PR: z.union([z.number(), z.boolean()]), // PR puede ser number o boolean
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
            PR: z.union([z.number(), z.boolean()]), // PR puede ser number o boolean
            Data: z.number()
        })).nullish(),
        ejercicios: z.array(z.object({
            ExerciciId: z.number(),
            Nom: z.string(),
            UserId: z.number(),
            PR: z.union([z.number(), z.boolean()]), // PR puede ser number o boolean
            GrupMuscular1: z.number().nullable(),
            GrupMuscular2: z.number().nullable(),
            GrupMuscular3: z.number().nullable(),
            GrupMuscular4: z.number().nullable(),
            GrupMuscular5: z.number().nullable(),

        })).nullish()
    })).nullish(),
    chatId: z.string().nullish()
})

export const updateUser = z.object({
    token: z.string().min(10),
    chatbotPrompt: z.string().max(1000).optional()
})

export const getUser = z.object({
    token: z.string().min(10)
})

export const garminCredentialsSave = z.object({
    token: z.string().min(10),
    garminEmail: z.string().email(),
    garminPassword: z.string().min(1)
})

export const garminCredentialsDelete = z.object({
    token: z.string().min(10)
})

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
