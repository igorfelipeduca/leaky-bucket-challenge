// import { z } from "zod";

// export const createTokenPolicyDto = z.object({
//   title: z
//     .string({ message: "Token policy title must be a string" })
//     .optional(),
//   companyId: z.number({ message: "Company id must be a number" }),
//   newTokenCooldown: z
//     .number({
//       message: "Company new token cooldown must be a number",
//     })
//     .optional(),
//   maxTokens: z
//     .number({ message: "Company max tokens must be a number" })
//     .optional(),
// });

import { t } from "elysia";

export const createTokenPolicyDto = t.Object({
  title: t.Optional(t.String()),
  companyId: t.Number(),
  newTokenCooldown: t.Optional(t.Number()),
  maxTokens: t.Optional(t.Number()),
});
