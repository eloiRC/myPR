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

