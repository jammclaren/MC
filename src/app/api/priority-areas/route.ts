import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { scopeJtfFilter } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import {
  computePriorityScore,
  RECENT_INCIDENT_WINDOW_DAYS,
} from "@/lib/priority-score";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const scopeJtfId = scopeJtfFilter(user);

    const windowStart = new Date(
      Date.now() - RECENT_INCIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    const areas = await prisma.electionArea.findMany({
      where: { jtfId: scopeJtfId },
      include: {
        incidents: {
          where: { date: { gte: windowStart } },
          select: { type: true, date: true },
        },
        deployments: { select: { deployedToPolling: true } },
      },
    });

    const scored = areas.map((area) => {
      const deployedToPolling = area.deployments.reduce(
        (sum, deployment) => sum + deployment.deployedToPolling,
        0
      );
      const priorityScore = computePriorityScore({
        hotspotCategory: area.hotspotCategory,
        incidents: area.incidents,
        deployedToPolling,
        registeredVoters: area.registeredVoters,
      });
      return {
        id: area.id,
        province: area.province,
        municipality: area.municipality,
        barangay: area.barangay,
        hotspotCategory: area.hotspotCategory,
        registeredVoters: area.registeredVoters,
        lat: area.lat,
        lng: area.lng,
        deployedToPolling,
        recentIncidentCount: area.incidents.length,
        priorityScore,
      };
    });

    scored.sort((a, b) => b.priorityScore - a.priorityScore);

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam), 100) : 10;

    return NextResponse.json(scored.slice(0, limit));
  } catch (error) {
    return handleApiError(error);
  }
}
