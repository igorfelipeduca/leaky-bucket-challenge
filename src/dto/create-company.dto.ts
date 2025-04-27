import { t } from "elysia";

export const createCompanyDto = t.Object({
  companyName: t.String({
    message: "Company name must be a string",
    examples: "Duca Corp.",
    minLength: 1,
  }),
});
