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
    nom: z.string(),
    grups_musculars: z.number().array().min(1).max(5)
})