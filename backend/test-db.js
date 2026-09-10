import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    include: {
      students: true,
      staff: true
    }
  });
  console.log(`Found ${schools.length} schools in database.`);
  schools.forEach(school => {
    console.log(`School: ${school.name}`);
    console.log(`  Staff: ${school.staff.length}`);
    console.log(`  Students: ${school.students.length}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
