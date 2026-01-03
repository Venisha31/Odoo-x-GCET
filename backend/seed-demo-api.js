const API_URL = 'http://localhost:5000/api';

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

async function runApiSeed() {
    console.log('🚀 Starting API-based Demo Data Seed...');

    // Helper
    async function request(method, endpoint, data = null, token = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined
            });
            return { status: res.status, data: await res.json() };
        } catch (err) {
            console.error(`❌ Request failed: ${method} ${endpoint}`, err.message);
            return null;
        }
    }

    // 1. Register Admin (Vedant Demo)
    const adminEmail = `vedant.demo.${Date.now()}@demo.com`;
    console.log(`\n1️⃣  Registering Demo Admin: ${adminEmail}`);

    const regRes = await request('POST', '/auth/register', {
        companyName: 'Dayflow India Ltd',
        name: 'Vedant Admin',
        email: adminEmail,
        password: 'Password123!'
    });

    if (regRes?.status !== 201) {
        console.error('❌ Admin Registration Failed:', regRes.data);
        return;
    }
    const adminToken = regRes.data.token;
    console.log('✅ Admin Registered & Logged In');

    // 2. Create 10 Employees
    console.log('\n2️⃣  Creating 10 Employees via API...');
    const employees = [];

    for (let i = 0; i < INDIAN_NAMES.length; i++) {
        const name = INDIAN_NAMES[i];
        const email = `${name.first.toLowerCase()}.${name.last.toLowerCase()}@demo.com`;

        // Random Dept
        const deptIndex = i % DEPARTMENTS.length;

        const createRes = await request('POST', '/auth/create-employee', {
            firstName: name.first,
            lastName: name.last,
            email,
            phone: `98765${String(i).padStart(5, '0')}`,
            department: DEPARTMENTS[deptIndex],
            position: POSITIONS[deptIndex],
            role: 'EMPLOYEE',
            basicSalary: (50000 + (i * 2000)).toString()
        }, adminToken);

        if (createRes?.status === 201) {
            const creds = createRes.data.credentials;
            // Login to get Token
            const loginRes = await request('POST', '/auth/login', {
                email: creds.email,
                password: creds.password
            });

            if (loginRes?.status === 200) {
                employees.push({
                    id: loginRes.data.user.employee.id,
                    token: loginRes.data.token,
                    name: name.first
                });
                process.stdout.write('.');
            }
        }
    }
    console.log(' Done.');

    // 3. Simulate Activity (Attendance & Leave)
    console.log('\n3️⃣  Simulating Activity for each Employee...');

    for (const emp of employees) {
        // A. Check-in (Today)
        await request('POST', '/attendance/check-in', {}, emp.token);

        // B. Apply Leave (Random)
        if (Math.random() > 0.5) {
            const leaveRes = await request('POST', '/leave/apply', {
                type: 'PAID',
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
                remarks: 'Demo Video Leave'
            }, emp.token);

            // C. Admin Approve
            if (leaveRes?.status === 201) {
                const leaveId = leaveRes.data.leaveRequest.id;
                await request('PUT', `/leave/${leaveId}/approve`, { adminComment: 'Demo Approved' }, adminToken);
            }
        }
    }
    console.log('✅ Activity Simulated');

    console.log('\n4️⃣  Triggering Payrolls...');
    // Only for first 5 to save time
    for (let i = 0; i < 5; i++) {
        const emp = employees[i];
        // We need payroll ID. Get payrolls first.
        const pRes = await request('GET', `/payroll/employee/${emp.id}`, null, adminToken);
        const pid = pRes?.data?.payroll?.[0]?.id;

        if (pid) {
            // Email is likely to fail without SMTP, but we try implies "Generating" action
            await request('POST', `/payroll/${pid}/email`, {}, adminToken);
        }
    }
    console.log('✅ Payrolls Processed');

    console.log('\n🎉 Demo Data Ready!');
    console.log(`Admin Email: ${adminEmail}`);
    console.log('Password:    Password123!');
}

runApiSeed();
