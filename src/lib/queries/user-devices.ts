import { prisma } from "@/lib/prisma";

export interface UserDeviceRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: "PENDING" | "APPROVED" | "KICKED";
  deviceLabel: string;
  deviceType: string;
  location: string | null;
  ipAddress: string | null;
  lastSeenAt: Date;
}

export async function listUserDevices(): Promise<UserDeviceRow[]> {
  const rows = await prisma.userDevice.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { lastSeenAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    status: r.status,
    deviceLabel: r.deviceLabel,
    deviceType: r.deviceType,
    location: r.location,
    ipAddress: r.ipAddress,
    lastSeenAt: r.lastSeenAt,
  }));
}
