import { Elysia, t } from "elysia";
import { Prisma, PrismaClient } from "../generated/prisma";
import { createUserDto } from "./dto/create-user.dto";
import { swagger } from "@elysiajs/swagger";
import * as bcrypt from "bcrypt";
import { createCompanyDto } from "./dto/create-company.dto";
import { loginDto } from "./dto/login.dto";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import { createTokenPolicyDto } from "./dto/create-token-policy.dto";
import cron from "@elysiajs/cron";

const db = new PrismaClient();

const app = new Elysia().use(
  swagger({
    documentation: {
      info: {
        title: "Leaky Bucket",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  })
);

dotenv.config();
app.listen(3000);

// refil user tokens at every hour
app.use(
  cron({
    name: "Refill Tokens",
    pattern: "0 * * * *",
    async run() {
      const companies = await db.company.findMany({
        include: {
          users: {
            include: {
              tokens: true,
            },
          },
          tokenPolicy: true,
        },
      });

      // if there are no companies or no companies with no users, skip this cron
      if (
        !companies.length ||
        !companies.some((company) => company.users.length)
      )
        return;

      // TODO: iterate through the users and token policies and generate the missing tokens
      for (const company of companies) {
        for (const user of company.users) {
          const policy = company.tokenPolicy;
          const tokensToAdd = (policy?.maxTokens ?? 10) - user.tokens.length;

          if (!Boolean(tokensToAdd)) return;

          for (let i = 0; i < tokensToAdd; i++) {
            await db.token.create({
              data: {
                userId: user.id,
                companyId: company.id,
              },
            });
          }

          console.log(`Created ${tokensToAdd} for user ${user.email}`);
        }
      }
    },
  })
);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

app.get("/hello-world", () => {
  return "hello world";
});

app.post(
  "/signup",
  async ({ body, error }) => {
    body.password = bcrypt.hashSync(body.password, 16);

    const dbCompany = await db.company.findUnique({
      where: { id: body.companyId },
      include: {
        tokenPolicy: true,
      },
    });

    if (!dbCompany) {
      return error(404, "Company does not exist");
    }

    if (!dbCompany.tokenPolicy) {
      return error(
        401,
        "You can not sign up on a company with no token policy."
      );
    }

    const emailExists = db.user.count({
      where: { email: body.email },
    });

    if (!Boolean(emailExists)) {
      return error(500, "Email is already in use");
    }

    const newUser = await db.user.create({
      data: body,
    });

    const createdTokens = [];

    for (let i = 0; i < dbCompany.tokenPolicy.maxTokens; i++) {
      try {
        const token = await db.token.create({
          data: {
            userId: newUser.id,
            companyId: body.companyId,
          },
        });

        createdTokens.push(token);
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          console.log("Token already exists for company/user");
        } else {
          throw e;
        }
      }
    }

    return { ...newUser, tokens: createdTokens };
  },
  {
    body: createUserDto,
  }
);

app.delete(
  "/user/:id",
  async ({ params, error }) => {
    const userId = Number(params.id);

    const dbUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!dbUser) {
      return error(404, "User not found");
    }

    await db.token.deleteMany({
      where: {
        userId: userId,
      },
    });

    return await db.user.delete({
      where: { id: userId },
    });
  },
  {
    params: t.Object({
      id: t.String(),
    }),
  }
);

app.get("/user", async () => {
  return await db.user.findMany();
});

app.post(
  "/login",
  async ({ body, error }) => {
    const dbUser = await db.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (!dbUser) {
      return error(401, "Unauthorized");
    }

    const passwordMatches = bcrypt.compareSync(body.password, dbUser.password);

    if (!passwordMatches) {
      return error(401, "Unauthorized");
    }

    const loginToken = jwt.sign(
      {
        email: body.email,
        password: dbUser.password,
      },
      process.env.JWT_SECRET_KEY ?? ""
    );

    return {
      token: loginToken,
    };
  },
  {
    body: loginDto,
  }
);

app.get("/company", async ({ query }) => {
  const showUsers = Boolean(query["showUsers"]);

  const companies = await db.company.findMany({
    include: {
      tokenPolicy: !showUsers && true,
      users: showUsers,
    },
  });

  return { companies };
});

app.post(
  "/company",
  async ({ body, error }) => {
    const newCompany = await db.company.create({
      data: body,
    });

    return { newCompany };
  },
  {
    body: createCompanyDto,
  }
);

app.post(
  "/token-policy",
  async ({ body, error }) => {
    const dbCompany = await db.company.findUnique({
      where: {
        id: body.companyId,
      },
    });

    if (!dbCompany) {
      return error(404, "Company not found");
    }

    let policyTitle;

    if (!body.title) {
      const cooldown = body.newTokenCooldown ?? 3600000;

      const cooldownTitles: Record<number, string> = {
        86400000: "Once every day token policy",
        3600000: "Once every hour token policy",
        60000: "Once every minute token policy",
      };

      body.title =
        cooldownTitles[cooldown] ?? `Once every ${cooldown}ms token policy`;
    } else policyTitle = body.title;

    const newTokenPolicy = await db.tokenPolicy.create({
      data: {
        title: policyTitle ?? "",
        ...body,
      },
    });

    return newTokenPolicy;
  },
  {
    body: createTokenPolicyDto,
  }
);

app.delete(
  "/token-policy/:id",
  async ({ params, error }) => {
    const tokenPolicy = await db.tokenPolicy.findUnique({
      where: { id: Number(params.id) },
    });

    if (!tokenPolicy) {
      return error(404, "Token policy not found");
    }

    await db.tokenPolicy.delete({
      where: { id: Number(params.id) },
    });

    return { success: true };
  },
  {
    params: t.Object({
      id: t.String(),
    }),
  }
);
