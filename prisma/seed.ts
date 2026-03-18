import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const DEFAULT_COURT_TYPES = [
  'High Court of Karnataka',
  'City Civil and Sessions Judge, Bangalore',
  'City Civil Courts Mayo Hall Unit, Bangalore',
  'Metropolitan Magistrate Court, Bangalore',
  'Family Court, Bangalore',
  'Small Causes Court, Bangalore',
  'Small Causes Court Mayo Hall Unit',
  'Addl. Chief Metropolitan Magistrate Judge, Bangalore',
  'Commercial Court, Bangalore',
  'Prl. Senior Civil Judge, Bangalore Rural',
  'Prl. District and Sessions Judge, Bangalore Rural',
  'Prl. Civil Judge, Bangalore',
  'Senior Civil Judge and JMFC, Anekal',
  'Prl. Civil Judge and JMFC, Anekal',
  'Addl. District and Sessions Judge, Sitting at Anekal',
  'Civil Judge and JMFC, Devanahalli',
  'Senior Civil Judge and JMFC, Devanahalli',
  'Addl. District and Sessions Court, Sitting at Devanahalli',
  'Addl. District and Sessions Judge, Sitting at Dodballapur',
  'Prl. Civil Judge and JMFC, Dodballapur',
  'Senior Civil Judge and JMFC, Dodballapur',
  'Prl. Civil Judge and JMFC, Nelamangala',
  'Senior Civil Judge and JMFC, Nelamangala',
  'Senior Civil Judge and JMFC, Kanakapura',
  'Senior Civil Judge and JMFC, Ramanagar',
  'Waqf Board',
  'Medical Counsel',
  'Prl District Judge, Mysore',
  'Deputy Commissioner Court',
  'Assistant Commissioner Court',
  'Court of the Regional Commissioner',
  'Land Grabbing Court',
  'Senior Civil Judge, Magadi',
];

async function main() {
  console.log('Seeding default court types...');

  let created = 0;
  for (const name of DEFAULT_COURT_TYPES) {
    const existing = await prisma.courtType.findFirst({
      where: { name, isDefault: true, firmId: null },
    });

    if (!existing) {
      await prisma.courtType.create({
        data: { name, isDefault: true, firmId: null },
      });
      created++;
    }
  }

  console.log(`Seeded ${created} new court types (${DEFAULT_COURT_TYPES.length - created} already existed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
