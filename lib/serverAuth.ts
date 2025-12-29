import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { prisma } from "./prisma";

export async function getServerUser() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      name: true,
      level: true,
      experience: true,
      createdAt: true,
      _count: {
        select: {
          missions: true,
          credits: true,
        },
      },
    },
  });

  if (!user) return null;

  // Oblicz łączną sumę kredytów (pole Credit.amount) dla użytkownika
  const creditsAggregate = await prisma.credit.aggregate({
    where: { userId: payload.id },
    _sum: {
      amount: true,
    },
  });

  const totalCredits = creditsAggregate._sum?.amount ?? 0;

  return {
    ...user,
    credits: totalCredits,
  };
}


