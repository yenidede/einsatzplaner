import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

console.log('Starte Prisma Seed...');
async function main() 
{
  
  // Organisation anlegen
  // First, try to find the organization by name
  let org = await prisma.organization.findFirst({ where: { name: 'JM-Hohenems' } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'JM-Hohenems' } });
  }

  // Rollen anlegen

    // Find role by name first


  // Find the role by name first, then use its id for upsert
  //#region 
  let superadminRole = await prisma.roles.findFirst({ where: { name: 'Superadmin' } });
  if (!superadminRole) {
    superadminRole = await prisma.roles.create({ data: { name: 'Superadmin' } });
  }
  let organisationsverwaltungsRole = await prisma.roles.findFirst({ where: { name: 'Organisationsverwaltung' } });
  if (!organisationsverwaltungsRole) {
    organisationsverwaltungsRole = await prisma.roles.create({ data: { name: 'Organisationsverwaltung' } });
  }
  
  let einsatzverwaltungsRole = await prisma.roles.findFirst({ where: { name: 'Einsatzverwaltung' } });
  if (!einsatzverwaltungsRole) {
    einsatzverwaltungsRole = await prisma.roles.create({ data: { name: 'Einsatzverwaltung' } });
  }

  let helferRole = await prisma.roles.findFirst({ where: { name: 'Helfer' } });
  if (!helferRole) {
    helferRole = await prisma.roles.create({ data: { name: 'Helfer' } });
  }
  //#endregion
  

  // User anlegen
  const passwordHash = await hash('testpass123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'oemer.yenidede@hak-bregenz.at' },
    update: {},
    create: {
      email: 'oemer.yenidede@hak-bregenz.at',
      password: passwordHash,
      firstname: 'Ömer',
      lastname: 'Yenidede',
      user_organization_role: {
        create: {
          organization: { connect: { id: org.id } },
          roles: { connect: { id: organisationsverwaltungsRole.id } }
        }
      }
    }
  });

  // Einsatz-Kategorie anlegen
  let einsatzKategorie = await prisma.einsatz_category.findFirst({ where: { value: 'Standard' } });
  if (!einsatzKategorie) {
    einsatzKategorie = await prisma.einsatz_category.create({ data: { value: 'Standard', identifier: 'standard' } });
  }

  // Einsatz-Status anlegen
  let einsatzStatus = await prisma.einsatz_status.findFirst({});
  if (!einsatzStatus) {
    einsatzStatus = await prisma.einsatz_status.create({ data: { status: { status: 'offen' } } });
  }

  // 10 Einsätze mit unterschiedlichen Daten erstellen
  for (let i = 1; i <= 10; i++) {
    const einsatz = await prisma.einsatz.create({
      data: {
        name: `Einsatz ${i}`,
        org_id: org.id,
        created_by: user.id,
        date: new Date(Date.now() + i * 86400000), // jeweils ein Tag später
        start_time: new Date(Date.now() + i * 86400000 + 3600000),
        end_time: new Date(Date.now() + i * 86400000 + 7200000),
        participant_count: 5 + i,
        price_per_person: 10 + i,
        total_price: (5 + i) * (10 + i),
        category_id: einsatzKategorie.id,
        status_id: einsatzStatus.id
      }
    });

    // Kommentar zum Einsatz
    await prisma.einsatz_comment.create({
      data: {
        einsatz_id: einsatz.id,
        user_id: user.id,
        comment: `Kommentar für Einsatz ${i}`
      }
    });

    // Helfer zum Einsatz
    await prisma.einsatz_helper.create({
      data: {
        einsatz_id: einsatz.id,
        user_id: user.id,
        joined_at: new Date(Date.now() + i * 86400000)
      }
    });

    // Custom Field für Einsatz
    const customField = await prisma.custom_field.create({
      data: {
        einsatz_id: einsatz.id,
        name: `Feld ${i}`,
        is_required: i % 2 === 0,
        placeholder: `Wert für Feld ${i}`
      }
    });

    // Custom Field Value für Einsatz
    await prisma.custom_field_value.create({
      data: {
        einsatz_id: einsatz.id,
        custom_field_id: customField.id,
        value: `Seed-Wert ${i}`
      }
    });
  }

  // Optional: If you want to add a comment, helper, and custom field for the last created einsatz in the loop,
  // you can store the last einsatz in a variable and use it here.
  // Otherwise, you can remove this block as similar data is already created inside the loop.

}

  console.log('Seed erfolgreich!');

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
