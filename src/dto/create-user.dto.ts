// import { z } from "zod";

// export const createUserDto = z.object({
//   name: z
//     .string({ message: "Name must be a string" })
//     .nonempty({ message: "Name must not be empty" }),
//   email: z
//     .string({ message: "Email must be a string" })
//     .email({ message: "Invalid email" }),
//   password: z.string({ message: "Password must be a string" }),
//   companyId: z.number({ message: "Company id must be a number" }),
// });

import { t } from "elysia";

export const createUserDto = t.Object({
  name: t.String({ minLength: 1 }),
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 1 }),
  companyId: t.Number(),
});
