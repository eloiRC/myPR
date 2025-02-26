import { z } from 'zod'

export const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, { message: "Minimum eight characters, at least one letter and one number " })
});

export const petition = z.object({
    token: z.string()
})

export const nouExercici = z.object({
    token: z.string(),
    nom: z.string().min(3),
    grups_musculars: z.number().array().min(1).max(5)
})

export const getEntrenos = z.object({
    token: z.string(),
    dataInici: z.number().min(1735693300).max(2529450460),
    dataFi: z.number().min(1735693300).max(2529450460)
}).refine(data => data.dataInici < data.dataFi, {
    message: "la fecha de fin es mas pequna que la de inicio"
})

