/**
 * System doświadczenia (XP) i poziomów
 */

/**
 * Oblicza wymagane XP do osiągnięcia następnego poziomu
 * Wzór: floor(100 * (1.15 ^ (level - 1)))
 */
export function getRequiredXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

/**
 * Oblicza aktualny poziom na podstawie całkowitego doświadczenia
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP <= 0) return 1;
  
  let level = 1;
  let xpNeeded = 0;
  
  while (xpNeeded <= totalXP) {
    const xpForNextLevel = getRequiredXPForLevel(level);
    if (xpNeeded + xpForNextLevel > totalXP) {
      break;
    }
    xpNeeded += xpForNextLevel;
    level++;
  }
  
  return level;
}

/**
 * Oblicza XP potrzebne do następnego poziomu
 */
export function getXPToNextLevel(totalXP: number, currentLevel: number): number {
  const xpForCurrentLevel = getXPForLevel(currentLevel);
  const xpNeededForNext = getRequiredXPForLevel(currentLevel);
  const xpInCurrentLevel = totalXP - xpForCurrentLevel;
  return Math.max(0, xpNeededForNext - xpInCurrentLevel);
}

/**
 * Oblicza całkowite XP potrzebne do osiągnięcia danego poziomu
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  
  let totalXP = 0;
  for (let i = 1; i < level; i++) {
    totalXP += getRequiredXPForLevel(i);
  }
  return totalXP;
}

/**
 * Oblicza XP w aktualnym poziomie (ile już zebrano w tym poziomie)
 */
export function getXPInCurrentLevel(totalXP: number, currentLevel: number): number {
  const xpForCurrentLevel = getXPForLevel(currentLevel);
  return totalXP - xpForCurrentLevel;
}

/**
 * Oblicza mnożnik XP na podstawie poziomu
 * Wzór: 1 + (level - 1) * 0.05
 */
export function getXPMultiplier(level: number): number {
  return 1 + (level - 1) * 0.05;
}

/**
 * Oblicza przyznane XP z uwzględnieniem mnożnika poziomu
 */
export function calculateAwardedXP(baseXP: number, level: number): number {
  const multiplier = getXPMultiplier(level);
  return Math.round(baseXP * multiplier);
}

/**
 * Bazowe wartości XP za różne akcje
 */
export const BASE_XP = {
  GENERATE_MISSION: 25,
  GENERATE_MISSION_EXTRA: 40,
  SWIPE: 5,
  FEED_COMPLETE: 50, // Bonus za ukończenie dziennego limitu (50 swipe'ów)
  REGISTER: 50,
  SUBSCRIBE_PREMIUM: 100,
  PURCHASE_USAGE: 30,
  EXCHANGE_CREDITS: 15,
} as const;

/**
 * Przyznaje XP użytkownikowi i zwraca nowy poziom oraz informacje o awansie
 */
export async function awardXP(
  prisma: { user: { update: (args: any) => Promise<any> } },
  userId: string,
  baseXP: number,
  currentLevel: number,
  currentXP: number
): Promise<{ newLevel: number; newXP: number; leveledUp: boolean }> {
  const awardedXP = calculateAwardedXP(baseXP, currentLevel);
  const newXP = currentXP + awardedXP;
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > currentLevel;

  // Aktualizuj użytkownika
  await prisma.user.update({
    where: { id: userId },
    data: {
      experience: newXP,
      level: newLevel,
    },
  });

  return {
    newLevel,
    newXP,
    leveledUp,
  };
}

