import type { Prisma, PrismaClient } from '@prisma/client';

/** Repositories work with the root client or inside `prisma.$transaction(async (tx) => …)`. */
export type Db = PrismaClient | Prisma.TransactionClient;
