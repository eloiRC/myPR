import { string, z } from 'zod'

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

