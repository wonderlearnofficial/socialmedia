import { z } from 'zod'

export const memberSchema = z.object({
  name: z.string().trim().min(1, 'team.nameRequired'),
  role: z
    .string()
    .trim()
    .default('Member')
    .transform((val) => val || 'Member'),
  email: z.string().trim().email('team.emailInvalid'),
  avatarUrl: z.string().optional(),
})

export type MemberFormValues = z.input<typeof memberSchema>
