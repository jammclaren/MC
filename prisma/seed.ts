import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const JTF_NAMES = ["JTF ZAMPELAN", "JTF ORION", "JTF CENTRAL", "JTF POSEIDON"] as const;

// NOTE: No source deck/PDF was provided when this project was scaffolded, so no real
// operational figures (neutralized personalities, firearms recovered, RIDO settlements,
// troop counts, etc.) are seeded here — inventing numbers for a real command's
// counter-threat statistics would be actively harmful. This seed only creates the
// reporting *structure* (JTFs, indicator taxonomy) so the schema and UI are demoable.
// Real quarterly figures must be entered by JTF staff through the app, or this seed
// script extended with the actual source-deck numbers.

const CTG_INDICATORS = [
  { name: "Nr of neutralized personalities", subgroup: null },
  { name: "Nr of firearms recovered/surrendered/confiscated/captured", subgroup: null },
  { name: "Nr of Regional Party Committees dismantled", subgroup: null },
  { name: "Nr of Sub-Regional Party Committees dismantled", subgroup: null },
  { name: "Nr of horizontal Party Committees dismantled", subgroup: null },
];

const LTG_SUBGROUPS = ["DI-Maute", "DI-Hassan", "BIFF-Bungos"];
const LTG_INDICATORS = [
  { name: "Nr of neutralized personalities" },
  { name: "Nr of firearms recovered/surrendered/confiscated/captured" },
  { name: "LTG Cell Defeated" },
];

const CBC_INVOLVING = ["LLEs/PAGs", "MNLF", "MILF"];

async function main() {
  const jtfs = await Promise.all(
    JTF_NAMES.map((name) =>
      prisma.jTF.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  for (const indicator of CTG_INDICATORS) {
    await prisma.indicator.upsert({
      where: { id: `seed-ctg-${indicator.name}` },
      update: {},
      create: {
        id: `seed-ctg-${indicator.name}`,
        category: "CTG",
        name: indicator.name,
        subgroup: indicator.subgroup,
      },
    });
  }

  for (const subgroup of LTG_SUBGROUPS) {
    for (const indicator of LTG_INDICATORS) {
      const id = `seed-ltg-${subgroup}-${indicator.name}`;
      await prisma.indicator.upsert({
        where: { id },
        update: {},
        create: {
          id,
          category: "LTG",
          name: indicator.name,
          subgroup,
        },
      });
    }
  }

  // CBC / RIDO settlements are tracked as RidoSettlement rows per JTF per quarter,
  // broken out by `involving` (LLEs/PAGs, MNLF, MILF) rather than as Indicator rows.
  // No indicator seed needed here; CBC_INVOLVING documents the allowed values for
  // the "involving" field, enforced at the application layer.
  void CBC_INVOLVING;

  const adminPasswordHash = await bcrypt.hash("ChangeMe123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@wesmincom.local" },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@wesmincom.local",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  console.log(`Seeded ${jtfs.length} JTFs, indicators, and a default admin user.`);
  console.log("Default admin login: admin@wesmincom.local / ChangeMe123! — change this immediately.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
