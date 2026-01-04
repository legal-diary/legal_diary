const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUserFirm() {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'siddharthrj4444@gmail.com' },
      include: { Firm_User_firmIdToFirm: true, Firm_Firm_ownerIdToUser: true }
    });

    console.log('User found:', user ? user.email : 'NOT FOUND');
    console.log('User firmId:', user?.firmId);
    console.log('Owned firm:', user?.Firm_Firm_ownerIdToUser?.name || 'None');

    if (!user) {
      console.log('User not found!');
      return;
    }

    // Check if user has a firm
    if (user.firmId) {
      console.log('User already has a firm:', user.Firm_User_firmIdToFirm?.name);
      return;
    }

    // Check for existing firms
    const firms = await prisma.firm.findMany();
    console.log('\nExisting firms:', firms.length);
    firms.forEach(f => console.log(`  - ${f.id}: ${f.name}`));

    // If user owns a firm, use that
    if (user.Firm_Firm_ownerIdToUser) {
      console.log('\nUser owns a firm, updating firmId...');
      await prisma.user.update({
        where: { id: user.id },
        data: { firmId: user.Firm_Firm_ownerIdToUser.id }
      });
      console.log('Done! Updated firmId to:', user.Firm_Firm_ownerIdToUser.id);
      return;
    }

    // If no firm exists, create one
    if (firms.length === 0) {
      console.log('\nNo firms exist. Creating a new firm...');
      const newFirm = await prisma.firm.create({
        data: {
          name: 'Law Firm',
          ownerId: user.id,
          updatedAt: new Date()
        }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { firmId: newFirm.id }
      });

      console.log('Created firm:', newFirm.name, 'with ID:', newFirm.id);
      console.log('Updated user firmId');
    } else {
      // Use the first existing firm
      console.log('\nUsing existing firm:', firms[0].name);
      await prisma.user.update({
        where: { id: user.id },
        data: { firmId: firms[0].id }
      });
      console.log('Updated user firmId to:', firms[0].id);
    }

    console.log('\nFix complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserFirm();
