import prisma from '@/lib/prisma';

async function main() {
  await prisma.user.create({
    data: {
      firstname: 'John',
      lastname: 'Doe',
      password: 'hashed-password-hier',
      email: 'john.doe@example.com',
    },
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
