import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

const SYSTEM_PROMPT = `
Jesteś projektantem misji dla par.
Tworzysz krótkie, przemyślane misje dla par.
Misje muszą być bezpieczne, pełne szacunku i promować połączenie między partnerami.
`;

export async function POST(req: Request) {
  try {
    const { category, extraMode } = await req.json();

    let previousMissionsText = "";
    if (extraMode) {
      const previousMissions = await prisma.mission.findMany({
        where: { category },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { content: true },
      });

      if (previousMissions.length > 0) {
        previousMissionsText = `\n\nPoprzednie misje z tej kategorii (${previousMissions.length}):\n${previousMissions.map((m, i) => `${i + 1}. ${m.content}`).join("\n")}\n\nWAŻNE: Stwórz misję, która RÓŻNI SIĘ od powyższych. Unikaj powtarzania podobnych pomysłów, tematów lub struktur.`;
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `
Wygeneruj JEDNĄ misję dla pary.
Kategoria: ${category}

Zasady:
- 1–3 zdania
- możliwa do wykonania dzisiaj
- bez języka terapeutycznego
- bez banałów
- ciepły, ludzki ton
- odpowiedź wyłącznie po polsku${previousMissionsText}
        `,
        },
      ],
    });

    const content =
      completion.choices[0]?.message?.content ?? "Nie udało się wygenerować misji.";

    const mission = await prisma.mission.create({
      data: {
        category,
        content,
      },
    });

    return NextResponse.json(mission);
  } catch (error) {
    console.error("Error in POST /api/mission:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować misji" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const missions = await prisma.mission.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json(missions);
  } catch (error) {
    console.error("Error in GET /api/mission:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać misji" },
      { status: 500 }
    );
  }
}
