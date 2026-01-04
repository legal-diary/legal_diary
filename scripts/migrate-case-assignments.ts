/**
 * Data Migration Script: Auto-assign existing cases to their creators
 *
 * This script finds all cases that don't have any CaseAssignment records
 * and creates an assignment linking each case to its creator (createdById).
 *
 * Run this script ONCE after deploying the CaseAssignment feature:
 * npx ts-node scripts/migrate-case-assignments.ts
 *
 * Or add to package.json:
 * "migrate:assignments": "ts-node scripts/migrate-case-assignments.ts"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCaseAssignments() {
  console.log('🔄 Starting case assignment migration...\n');

  try {
    // Find all cases that have no assignments
    const casesWithoutAssignments = await prisma.case.findMany({
      where: {
        assignments: {
          none: {},
        },
      },
      select: {
        id: true,
        caseNumber: true,
        createdById: true,
      },
    });

    console.log(`📊 Found ${casesWithoutAssignments.length} cases without assignments\n`);

    if (casesWithoutAssignments.length === 0) {
      console.log('✅ All cases already have assignments. No migration needed.');
      return;
    }

    // Create assignments for each case
    let successCount = 0;
    let errorCount = 0;

    for (const caseRecord of casesWithoutAssignments) {
      try {
        await prisma.caseAssignment.create({
          data: {
            caseId: caseRecord.id,
            userId: caseRecord.createdById,
          },
        });
        successCount++;
        console.log(`  ✓ Assigned case ${caseRecord.caseNumber} to creator`);
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Failed to assign case ${caseRecord.caseNumber}:`, error);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  - Successfully assigned: ${successCount}`);
    console.log(`  - Failed: ${errorCount}`);
    console.log(`  - Total processed: ${casesWithoutAssignments.length}`);

    if (errorCount === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️ Migration completed with some errors. Please review the logs above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateCaseAssignments();
