const PDFDocument = require('pdfkit');

/**
 * Generate a professional salary slip PDF
 * @param {Object} payroll - Payroll data
 * @param {Object} employee - Employee data
 * @param {Object} company - Company data
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateSalarySlip = (payroll, employee, company = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const primaryColor = '#4f46e5';
            const textColor = '#111827';
            const mutedColor = '#6b7280';

            // Header
            doc.fontSize(24)
                .fillColor(primaryColor)
                .text('⚡ ' + (company.name || 'Dayflow'), 50, 50);

            doc.fontSize(10)
                .fillColor(mutedColor)
                .text('Human Resource Management System', 50, 80);

            // Title
            doc.fontSize(16)
                .fillColor(textColor)
                .text('SALARY SLIP', 400, 50, { align: 'right' });

            doc.fontSize(10)
                .fillColor(mutedColor)
                .text(`${getMonthName(payroll.month)} ${payroll.year}`, 400, 70, { align: 'right' });

            // Horizontal line
            doc.strokeColor('#e5e7eb')
                .lineWidth(1)
                .moveTo(50, 110)
                .lineTo(545, 110)
                .stroke();

            // Employee Details Section
            doc.fontSize(12)
                .fillColor(primaryColor)
                .text('Employee Details', 50, 130);

            const employeeDetails = [
                ['Name', `${employee.firstName} ${employee.lastName}`],
                ['Employee ID', employee.employeeId],
                ['Department', employee.department || 'N/A'],
                ['Position', employee.position || 'N/A'],
                ['Email', employee.email]
            ];

            let y = 155;
            employeeDetails.forEach(([label, value]) => {
                doc.fontSize(10)
                    .fillColor(mutedColor).text(label + ':', 50, y)
                    .fillColor(textColor).text(value, 150, y);
                y += 18;
            });

            // Earnings Section
            doc.fontSize(12)
                .fillColor(primaryColor)
                .text('Earnings', 50, y + 20);

            y += 45;
            const earnings = [
                ['Basic Wage', payroll.basicWage || 0],
                ['House Rent Allowance (HRA)', payroll.hra || 0],
                ['Dearness Allowance (DA)', payroll.da || 0],
                ['Bonus', payroll.bonus || 0]
            ];

            let totalEarnings = 0;
            earnings.forEach(([label, amount]) => {
                totalEarnings += amount;
                doc.fontSize(10)
                    .fillColor(textColor).text(label, 50, y)
                    .text(`₹${amount.toLocaleString()}`, 400, y, { align: 'right' });
                y += 18;
            });

            // Total Earnings
            doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(50, y + 5).lineTo(545, y + 5).stroke();
            y += 15;
            doc.fontSize(11)
                .fillColor(textColor)
                .font('Helvetica-Bold')
                .text('Total Earnings', 50, y)
                .text(`₹${totalEarnings.toLocaleString()}`, 400, y, { align: 'right' });
            doc.font('Helvetica');

            // Deductions Section
            y += 35;
            doc.fontSize(12)
                .fillColor(primaryColor)
                .text('Deductions', 50, y);

            y += 25;
            const deductions = [
                ['Provident Fund (PF)', payroll.pf || 0],
                ['Employee State Insurance (ESI)', payroll.esi || 0],
                ['Professional Tax', payroll.tax || 0]
            ];

            let totalDeductions = 0;
            deductions.forEach(([label, amount]) => {
                totalDeductions += amount;
                doc.fontSize(10)
                    .fillColor(textColor).text(label, 50, y)
                    .fillColor('#dc2626').text(`- ₹${amount.toLocaleString()}`, 400, y, { align: 'right' });
                y += 18;
            });

            // Total Deductions
            doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(50, y + 5).lineTo(545, y + 5).stroke();
            y += 15;
            doc.fontSize(11)
                .fillColor('#dc2626')
                .font('Helvetica-Bold')
                .text('Total Deductions', 50, y)
                .text(`- ₹${totalDeductions.toLocaleString()}`, 400, y, { align: 'right' });
            doc.font('Helvetica');

            // Net Salary Box
            y += 40;
            doc.rect(50, y, 495, 60)
                .fill('#f0fdf4');

            doc.fontSize(14)
                .fillColor(textColor)
                .text('NET SALARY', 70, y + 15);

            doc.fontSize(24)
                .fillColor('#059669')
                .font('Helvetica-Bold')
                .text(`₹${(payroll.netSalary || 0).toLocaleString()}`, 70, y + 35);
            doc.font('Helvetica');

            // Footer
            y += 90;
            doc.fontSize(9)
                .fillColor(mutedColor)
                .text('This is a computer-generated document and does not require a signature.', 50, y, { align: 'center' });

            doc.text(`Generated on ${new Date().toLocaleDateString()}`, 50, y + 15, { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || 'Unknown';
};

module.exports = { generateSalarySlip };
