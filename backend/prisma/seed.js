/**
 * Database Seed Script for BURSA
 * Populates database for Crown Heights College with:
 * - Unique school slug: "crown-heights"
 * - Staff credentials (Proprietor & Head Bursar)
 * - Standardized Fee Schedules for Primary, JSS, and SSS
 * - Enrolled student records with admission numbers (e.g. ADM-101) & DVAs
 * - Active Term invoices and realistic payment installments
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BURSA database seed...');

  // 1. Clear existing data in correct foreign key order
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.feeScheduleItem.deleteMany();
  await prisma.feeSchedule.deleteMany();
  await prisma.suspenseTransaction.deleteMany();
  await prisma.virtualAccount.deleteMany();
  await prisma.student.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.school.deleteMany();

  // 2. Create School: Crown Heights College with unique slug
  const school = await prisma.school.create({
    data: {
      name: 'Crown Heights College',
      slug: 'crown-heights',
      phone: '08012345678',
      email: 'bursar@crownheights.edu.ng'
    }
  });

  console.log(`🏫 Created School: ${school.name} (Slug: ${school.slug})`);

  // 3. Seed Staff User Accounts
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  const proprietor = await prisma.staff.create({
    data: {
      schoolId: school.id,
      fullName: 'Chief (Mrs.) Folashade Tinubu-Adeyemi',
      email: 'proprietor@crownheights.edu.ng',
      phone: '08021112233',
      passwordHash: defaultPasswordHash,
      role: 'PROPRIETOR'
    }
  });

  const headBursar = await prisma.staff.create({
    data: {
      schoolId: school.id,
      fullName: 'Mr. Emmanuel Okon',
      email: 'bursar@crownheights.edu.ng',
      phone: '08052223344',
      passwordHash: defaultPasswordHash,
      role: 'BURSAR'
    }
  });

  console.log(`👑 Created Proprietor: ${proprietor.fullName} (${proprietor.role})`);
  console.log(`💼 Created Head Bursar: ${headBursar.fullName} (${headBursar.role})`);

  // 4. Seed Standardized Fee Schedules for First Term 2026/2027
  const feeTemplates = [
    {
      classes: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
      totalAmountKobo: 110000 * 100,
      items: [
        { description: 'Tuition Fee', amountKobo: 80000 * 100 },
        { description: 'Textbooks & Workbooks', amountKobo: 20000 * 100 },
        { description: 'PTA Levy', amountKobo: 10000 * 100 }
      ]
    },
    {
      classes: ['JSS 1', 'JSS 2', 'JSS 3'],
      totalAmountKobo: 150000 * 100,
      items: [
        { description: 'Tuition Fee', amountKobo: 110000 * 100 },
        { description: 'ICT & Lab Fee', amountKobo: 25000 * 100 },
        { description: 'PTA Levy', amountKobo: 15000 * 100 }
      ]
    },
    {
      classes: ['SSS 1', 'SSS 2', 'SSS 3'],
      totalAmountKobo: 180000 * 100,
      items: [
        { description: 'Tuition Fee', amountKobo: 130000 * 100 },
        { description: 'Science Lab Fee', amountKobo: 30000 * 100 },
        { description: 'PTA Levy', amountKobo: 20000 * 100 }
      ]
    }
  ];

  const scheduleMap = {};
  for (const group of feeTemplates) {
    for (const classGrade of group.classes) {
      const schedule = await prisma.feeSchedule.create({
        data: {
          schoolId: school.id,
          classGrade,
          term: 'First Term',
          academicSession: '2026/2027',
          totalAmountKobo: group.totalAmountKobo,
          items: {
            create: group.items.map((it) => ({
              description: it.description,
              amountKobo: it.amountKobo
            }))
          }
        },
        include: { items: true }
      });
      scheduleMap[classGrade] = schedule;
    }
  }

  console.log(`📋 Seeded 11 class fee schedules for First Term 2026/2027!`);

  // 5. Seed Students with Admission Numbers, DVAs, and Initial Invoices
  const families = [
    {
      parentName: 'Chief & Mrs. Emeka Okafor',
      parentPhone: '08031234567',
      children: [
        { firstName: 'Chinedu', lastName: 'Okafor', classGrade: 'JSS 2', initialPaid: 150000, admissionNumber: 'ADM-101' },
        { firstName: 'Amaka', lastName: 'Okafor', classGrade: 'Primary 4', initialPaid: 50000, admissionNumber: 'ADM-102' },
        { firstName: 'Kamsi', lastName: 'Okafor', classGrade: 'Primary 1', initialPaid: 0, admissionNumber: 'ADM-103' }
      ]
    },
    {
      parentName: 'Mr. Samuel Adesuyi',
      parentPhone: '08066360787',
      children: [
        { firstName: 'John', lastName: 'Adesuyi', classGrade: 'SSS 2', initialPaid: 180000, admissionNumber: 'ADM-104' },
        { firstName: 'Joseph', lastName: 'Adesuyi', classGrade: 'JSS 1', initialPaid: 75000, admissionNumber: 'ADM-105' }
      ]
    },
    {
      parentName: 'Engr. & Mrs. Babatunde Adeyemi',
      parentPhone: '08029876543',
      children: [
        { firstName: 'Folake', lastName: 'Adeyemi', classGrade: 'SSS 2', initialPaid: 180000, admissionNumber: 'ADM-106' },
        { firstName: 'Tobi', lastName: 'Adeyemi', classGrade: 'JSS 3', initialPaid: 75000, admissionNumber: 'ADM-107' }
      ]
    },
    {
      parentName: 'Alhaji & Alhaja Bello',
      parentPhone: '08055551234',
      children: [
        { firstName: 'Zainab', lastName: 'Bello', classGrade: 'SSS 3', initialPaid: 180000, admissionNumber: 'ADM-108' },
        { firstName: 'Usman', lastName: 'Bello', classGrade: 'JSS 1', initialPaid: 0, admissionNumber: 'ADM-109' }
      ]
    },
    {
      parentName: 'Col. (Rtd) & Mrs. Danjuma',
      parentPhone: '08077778899',
      children: [
        { firstName: 'Amina', lastName: 'Danjuma', classGrade: 'Primary 5', initialPaid: 110000, admissionNumber: 'ADM-110' },
        { firstName: 'Fatima', lastName: 'Danjuma', classGrade: 'Primary 2', initialPaid: 40000, admissionNumber: 'ADM-111' }
      ]
    },
    {
      parentName: 'Dr. & Dr. (Mrs) Igwe',
      parentPhone: '08064445566',
      children: [
        { firstName: 'Somto', lastName: 'Igwe', classGrade: 'SSS 1', initialPaid: 180000, admissionNumber: 'ADM-112' },
        { firstName: 'Nneka', lastName: 'Igwe', classGrade: 'JSS 2', initialPaid: 0, admissionNumber: 'ADM-113' }
      ]
    },
    {
      parentName: 'Dr. & Mrs. Eze',
      parentPhone: '08033334444',
      children: [
        { firstName: 'Emeka', lastName: 'Eze', classGrade: 'SSS 1', initialPaid: 90000, admissionNumber: 'ADM-114' },
        { firstName: 'Chidi', lastName: 'Eze', classGrade: 'Primary 3', initialPaid: 0, admissionNumber: 'ADM-115' }
      ]
    },
    {
      parentName: 'Mr. & Mrs. Damilola Akinyemi',
      parentPhone: '08081112233',
      children: [
        { firstName: 'Yinka', lastName: 'Akinyemi', classGrade: 'SSS 3', initialPaid: 180000, admissionNumber: 'ADM-116' },
        { firstName: 'Yetunde', lastName: 'Akinyemi', classGrade: 'JSS 1', initialPaid: 50000, admissionNumber: 'ADM-117' }
      ]
    },
    {
      parentName: 'Mallam & Hajia Abubakar',
      parentPhone: '08039998877',
      children: [
        { firstName: 'Tariq', lastName: 'Abubakar', classGrade: 'SSS 2', initialPaid: 0, admissionNumber: 'ADM-118' }
      ]
    },
    {
      parentName: 'Mrs. Grace Okon',
      parentPhone: '08052223344',
      children: [
        { firstName: 'Blessing', lastName: 'Okon', classGrade: 'Primary 3', initialPaid: 0, admissionNumber: 'ADM-119' }
      ]
    },
    {
      parentName: 'Mr. & Mrs. Ovie',
      parentPhone: '08061239876',
      children: [
        { firstName: 'Eseoghene', lastName: 'Ovie', classGrade: 'JSS 3', initialPaid: 75000, admissionNumber: 'ADM-120' }
      ]
    },
    {
      parentName: 'Pastor & Mrs. Abiodun',
      parentPhone: '08047771122',
      children: [
        { firstName: 'Grace', lastName: 'Abiodun', classGrade: 'Primary 1', initialPaid: 0, admissionNumber: 'ADM-121' },
        { firstName: 'Daniel', lastName: 'Abiodun', classGrade: 'JSS 2', initialPaid: 150000, admissionNumber: 'ADM-122' }
      ]
    }
  ];

  let totalStudents = 0;
  let accountCounter = 9910000100;

  for (const family of families) {
    for (const child of family.children) {
      accountCounter += 1;
      const accountNumber = String(accountCounter);

      // 1. Create Student with Admission Number
      const student = await prisma.student.create({
        data: {
          schoolId: school.id,
          admissionNumber: child.admissionNumber,
          firstName: child.firstName,
          lastName: child.lastName,
          classGrade: child.classGrade,
          parentName: family.parentName,
          parentPhone: family.parentPhone,
          virtualAccount: {
            create: {
              accountNumber,
              bankName: 'Wema Bank',
              accountName: `Crown Heights / ${child.firstName} ${child.lastName[0]}.`
            }
          }
        }
      });

      totalStudents += 1;

      // 2. Clone Fee Schedule into Invoice
      const schedule = scheduleMap[child.classGrade];
      if (schedule) {
        const totalAmountKobo = schedule.totalAmountKobo;
        const initialPaidKobo = (child.initialPaid || 0) * 100;

        let status = 'UNPAID';
        if (initialPaidKobo >= totalAmountKobo) {
          status = 'PAID';
        } else if (initialPaidKobo > 0) {
          status = 'PART_PAID';
        }

        const invoice = await prisma.invoice.create({
          data: {
            studentId: student.id,
            schoolId: school.id,
            term: 'First Term',
            academicSession: '2026/2027',
            totalAmountKobo,
            amountPaidKobo: initialPaidKobo,
            status,
            dueDate: new Date('2026-10-31'),
            items: {
              create: schedule.items.map((it) => ({
                description: it.description,
                amountKobo: it.amountKobo
              }))
            }
          }
        });

        // 3. Record cleared payment if initial payment exists
        if (initialPaidKobo > 0) {
          await prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              transactionReference: `SEED_TXN_${student.id.slice(0, 8).toUpperCase()}`,
              amountKobo: initialPaidKobo,
              paymentMethod: 'BANK_TRANSFER'
            }
          });
        }
      }
    }
  }

  console.log(`✅ Successfully seeded ${totalStudents} students with admission numbers, DVAs, and invoices!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
