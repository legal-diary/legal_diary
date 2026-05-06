import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the first admin user to use as createdById
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true, firmId: true, name: true },
  });

  if (!admin || !admin.firmId) {
    // Fall back to any user with a firmId
    const anyUser = await prisma.user.findFirst({
      where: { firmId: { not: null } },
      select: { id: true, firmId: true, name: true },
    });
    if (!anyUser) {
      console.error('No users found in DB. Register a user first.');
      process.exit(1);
    }
    Object.assign(admin ?? {}, anyUser);
  }

  const user = admin;
  console.log(`Seeding as user: ${user.name} (firmId: ${user.firmId})`);

  const dummies = [
    {
      type: 'RESEARCH',
      category: 'Family',
      headnote: `<p>The Supreme Court held that <strong>mutual consent divorce</strong> under Section 13B of the Hindu Marriage Act, 1955 requires both parties to genuinely agree. A party cannot be compelled to give consent merely because the other spouse desires separation.</p><ul><li>Six-month cooling-off period can be waived by the court in exceptional circumstances</li><li>Irretrievable breakdown of marriage is a valid ground</li></ul>`,
      citation: 'AIR 2023 SC 1234',
    },
    {
      type: 'OFFICE_JUDGMENT',
      category: 'Land',
      headnote: `<p>In a suit for <em>specific performance</em> of an agreement to sell agricultural land, the Court emphasised that time is not of the essence unless expressly stated. The defendant's refusal to execute the sale deed after receiving the advance constitutes breach of contract.</p><blockquote>Ready and willing to perform is a condition precedent for granting specific performance — Saradamani Kandappan v. S. Rajalakshmi.</blockquote>`,
      citation: '2024 SCC OnLine 567',
    },
    {
      type: 'RESEARCH',
      category: 'Contract',
      headnote: `<h2>Key Principle</h2><p>A <strong>contract of guarantee</strong> under Section 126 of the Indian Contract Act is a tripartite agreement. The surety's liability is co-extensive with that of the principal debtor unless limited by the contract. Discharge of the principal debtor discharges the surety.</p><ol><li>Variation in terms without surety's consent discharges the surety</li><li>Giving time to debtor without surety's consent releases surety</li><li>Creditor's act impairing surety's remedy releases surety</li></ol>`,
      citation: 'AIR 2022 SC 987',
    },
    {
      type: 'OFFICE_JUDGMENT',
      category: 'Property',
      headnote: `<p>The Karnataka High Court affirmed that a <strong>gift deed</strong> executed by a person of unsound mind is void ab initio. The burden of proving unsoundness of mind lies on the party alleging it. Medical evidence combined with witness testimony is sufficient.</p><p>Further held: registration of a void document does not cure the defect of incapacity.</p>`,
      citation: '(2023) 4 SCC 321',
    },
    {
      type: 'RESEARCH',
      category: 'Criminal',
      headnote: `<p>The Supreme Court reiterated the principles governing grant of <strong>anticipatory bail</strong> under Section 438 CrPC. Economic offences involving public funds are to be treated with greater seriousness. Mere apprehension of arrest is not sufficient — there must be a reasonable belief of actual threat.</p><ul><li>Gravity of accusation is a relevant factor</li><li>Antecedents of the applicant must be considered</li><li>Custodial interrogation necessity cannot be ignored</li></ul>`,
      citation: '2023 SCC OnLine SC 412',
    },
    {
      type: 'OFFICE_JUDGMENT',
      category: 'Service',
      headnote: `<p>In a writ petition challenging termination from government service, the Division Bench held that <strong>natural justice</strong> is non-negotiable even in cases of misconduct. A departmental enquiry conducted without providing a copy of the charge-sheet is vitiated.</p><blockquote>Principles of natural justice are not procedural formalities — they are substantive rights.</blockquote><p>Reinstatement with 50% back wages ordered.</p>`,
      citation: 'AIR 2024 Karnataka 88',
    },
  ];

  let created = 0;
  for (const d of dummies) {
    await prisma.judgment.create({
      data: {
        firmId: user.firmId,
        createdById: user.id,
        type: d.type,
        category: d.category,
        headnote: d.headnote,
        citation: d.citation,
      },
    });
    created++;
    console.log(`  ✓ Created [${d.type}] ${d.citation}`);
  }

  console.log(`\nDone — ${created} dummy judgments seeded.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
