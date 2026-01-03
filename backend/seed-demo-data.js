const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Data Pools
const INDIAN_NAMES = [
    { first: 'Aarav', last: 'Sharma' },
    { first: 'Vihaan', last: 'Patel' },
    { first: 'Aditi', last: 'Gupta' },
    { first: 'Diya', last: 'Singh' },
    { first: 'Kabir', last: 'Verma' },
    { first: 'Ananya', last: 'Reddy' },
    { first: 'Reyansh', last: 'Kumar' },
    { first: 'Saanvi', last: 'Iyer' },
    { first: 'Ishaan', last: 'Malhotra' },
    { first: 'Priya', last: 'Desai' }
];

const DEPARTMENTS = ['Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance'];
const POSITIONS = ['Software Engineer', 'HR Executive', 'Sales Manager', 'Marketing Specialist', 'Accountant'];

async function seedData() {
    console.log('🌱 Starting Demo Data Seed...');

    // 1. Ensure Admin User (Vedant)
    const adminEmail = 'vedant@demo.com'; // Using a clean demo email
    // Or if user insists on "vedant", we can search for a user with name containing 'Vedant'
    // But for safety of the script, let's create a dedicated Demo Admin.

    console.log('1️⃣  Creating/Verifying Demo Admin...');

    // Find or Create Company
    let company = await prisma.company.findFirst();
    if (!company) {
        company = await prisma.company.create({
            data: { name: 'Dayflow India Ltd.', code: 'DIND' }
        });
    }

    const adminPass = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            password: adminPass,
            role: 'ADMIN',
            companyId: company.id,
            employee: {
                create: {
                    employeeId: 'ADM001',
                    firstName: 'Vedant',
                    lastName: 'Admin',
                    email: adminEmail,
                    phone: '9999999999',
                    department: 'Management',
                    position: 'CEO',
                    companyId: company.id,
                    leaveAllocation: { create: { paidLeaves: 30, sickLeaves: 15 } }
                }
            }
        }
    });

    console.log(`✅ Admin Ready: ${adminEmail} / admin123`);

    // 2. Create 10 Employees
    console.log('\n2️⃣  Creating 10 Indian Employees...');
    const employees = [];

    for (let i = 0; i < INDIAN_NAMES.length; i++) {
        const name = INDIAN_NAMES[i];
        const email = `${name.first.toLowerCase()}.${name.last.toLowerCase()}@demo.com`;

        // Generate Emp ID
        const empId = `EMP${2024000 + i}`;
        const password = await bcrypt.hash('password123', 10);

        // Random Dept & Position
        const deptIndex = i % DEPARTMENTS.length;
        const dept = DEPARTMENTS[deptIndex];
        const pos = POSITIONS[deptIndex];

        const user = await prisma.user.upsert({
            where: { email },
            update: {}, // Don't overwrite if exists
            create: {
                email,
                password,
                role: 'EMPLOYEE',
                companyId: company.id,
                employee: {
                    create: {
                        employeeId: empId,
                        firstName: name.first,
                        lastName: name.last,
                        email,
                        phone: `98765${String(i).padStart(5, '0')}`,
                        department: dept,
                        position: pos,
                        companyId: company.id,
                        leaveAllocation: { create: { paidLeaves: 24, sickLeaves: 12 } }
                    }
                }
            },
            include: { employee: true }
        });

        employees.push(user.employee);
        process.stdout.write('.');
    }
    console.log(' Done.');

    // 3. Simulate Attendance (Past 30 Days)
    console.log('\n3️⃣  Simulating Attendance (Last 30 Days)...');
    const today = new Date();

    for (const emp of employees) {
        for (let d = 30; d >= 0; d--) {
            const date = new Date(today);
            date.setDate(date.getDate() - d);

            // Skip weekends (approx)
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            // Randomize: 80% Present, 10% Late, 10% Absent (no record or leave)
            const rand = Math.random();

            if (rand > 0.2) { // Present
                // Check-in around 9:00 AM
                const checkIn = new Date(date);
                checkIn.setHours(9, Math.floor(Math.random() * 30), 0); // 9:00 - 9:30

                // Check-out around 6:00 PM
                const checkOut = new Date(date);
                checkOut.setHours(18, Math.floor(Math.random() * 60), 0); // 18:00 - 19:00

                // Status
                let status = 'PRESENT';
                if (checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 15)) {
                    status = 'LATE';
                }

                await prisma.attendance.upsert({
                    where: {
                        employeeId_date: {
                            employeeId: emp.id,
                            date: new Date(date.setHours(0, 0, 0, 0))
                        }
                    },
                    update: {},
                    create: {
                        employeeId: emp.id,
                        date: new Date(date.setHours(0, 0, 0, 0)),
                        checkInTime: checkIn,
                        checkOutTime: checkOut,
                        status
                    }
                });
            }
        }
        process.stdout.write('.');
    }
    console.log(' Done.');

    // 4. Leave Requests
    console.log('\n4️⃣  Creating Leave Requests...');
    // Create 1 APPROVED leave for first 5 users
    for (let i = 0; i < 5; i++) {
        const emp = employees[i];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 15); // 15 days ago

        await prisma.leaveRequest.create({
            data: {
                employeeId: emp.id,
                type: 'PAID',
                startDate,
                endDate: startDate,
                remarks: 'Personal Work',
                status: 'APPROVED',
                adminComment: 'Approved by Vedant'
            }
        });

        // Update allocation
        await prisma.leaveAllocation.update({
            where: { employeeId: emp.id },
            data: { paidUsed: { increment: 1 } }
        });
    }

    // Create 2 PENDING leaves for next 2 users
    for (let i = 5; i < 7; i++) {
        const emp = employees[i];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 2); // In future

        await prisma.leaveRequest.create({
            data: {
                employeeId: emp.id,
                type: 'SICK',
                startDate,
                endDate: startDate,
                remarks: 'Doctor Appointment',
                status: 'PENDING'
            }
        });
    }
    console.log('Done.');

    // 5. Payroll Generation
    console.log('\n5️⃣  Generating Payroll (Current Month)...');
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    for (const emp of employees) {
        const basic = 50000 + Math.floor(Math.random() * 20000); // 50k - 70k
        const allowance = 10000;
        const deduction = 5000;
        const net = basic + allowance - deduction;

        // Check if exists
        const exists = await prisma.payroll.findUnique({
            where: {
                employeeId_month_year: {
                    employeeId: emp.id,
                    month,
                    year
                }
            }
        });

        if (!exists) {
            await prisma.payroll.create({
                data: {
                    employeeId: emp.id,
                    month,
                    year,
                    basicWage: basic,
                    monthlyWage: basic,
                    yearlyWage: basic * 12,
                    workingDays: 22,
                    hra: 5000,
                    da: 3000,
                    bonus: 2000,
                    pf: 2000,
                    esi: 1000,
                    tax: 2000,
                    netSalary: net
                }
            });
        }
    }
    console.log('Done.');

    console.log('\n🎉 Demo Data Seed Completed!');
    console.log('--------------------------------');
    console.log('Admin Login: vedant@demo.com');
    console.log('Password:    admin123');
    console.log('--------------------------------');
    console.log('Employee Login Pattern: firstname.lastname@demo.com');
    console.log('Password:    password123');
    console.log('--------------------------------');
}

seedData()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
