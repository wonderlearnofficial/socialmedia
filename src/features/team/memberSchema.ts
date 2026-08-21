import { z } from 'zod'

export const memberSchema = z.object({
  name: z.string().trim().min(1, 'team.nameRequired'),
  role: z.string().trim().min(1, 'team.roleRequired'),
  email: z.string().trim().email('team.emailInvalid'),
})

export type MemberFormValues = z.input<typeof memberSchema>
