import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      firstname: 'John',
      lastname: 'Doe',
      password: 'hashed-password-hier',
      email: 'john.doe@example.com',
    },
  });
  // Organisation anlegen
  // First, try to find the organization by name
  let org = await prisma.organization.findFirst({ where: { name: 'TestOrg' } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'TestOrg' } });
  }

  // Rollen anlegen

    // Find role by name first
    let helferRole = await prisma.roles.findFirst({ where: { name: 'Helfer' } });
    if (!helferRole) {
      helferRole = await prisma.roles.create({ data: { name: 'Helfer' } });
    }

  // User anlegen
  const passwordHash = await hash('testpass123', 12);
  await prisma.user.create({
    data: {
      email: 'testuser@example.com',
      firstname: 'Test',
      lastname: 'User',
      password: passwordHash,
      phone: '+43 123 456789',
      user_organization_role: {
        create: [{
          organization: { connect: { id: org.id } },
          roles: { connect: { id: helferRole.id } },
        }],
      },
    },
  });

  console.log('Seed erfolgreich!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


async function hash(password: string, saltRounds: number): Promise<string> {
  return await bcrypt.hash(password, saltRounds);
}

