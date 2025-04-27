// import { z } from "zod";

// export const loginDto = z.object({
//   email: z
//     .string({ message: "Email must be a string" })
//     .email({ message: "Invalid email" })
//     .nonempty({ message: "Email must not be empty" }),
//   password: z
//     .string({ message: "Password must be a string" })
//     .nonempty({ message: "Password must not be empty" }),
// });

import { t } from "elysia";

export const loginDto = t.Object({
  email: t.String({ format: "email", minLength: 1 }),
  password: t.String({ minLength: 1 }),
});
