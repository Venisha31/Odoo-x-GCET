const nodemailer = require('nodemailer');

// Create transporter with SMTP config
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Send email helper
const sendEmail = async (to, subject, html) => {
    try {
        // Skip if SMTP not configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log('📧 Email skipped (SMTP not configured):', { to, subject });
            return { success: false, reason: 'SMTP not configured' };
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: `"Dayflow HRMS" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('📧 Email error:', error.message);
        return { success: false, error: error.message };
    }
};

// Welcome email with credentials
const sendWelcomeEmail = async (employee, credentials) => {
    const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4f46e5; margin: 0;">⚡ Dayflow</h1>
                <p style="color: #6b7280; margin-top: 8px;">Human Resource Management System</p>
            </div>
            
            <div style="background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
                <h2 style="color: #111827; margin: 0 0 20px;">Welcome to the Team, ${employee.firstName}!</h2>
                <p style="color: #4b5563; line-height: 1.6;">
                    Your account has been created. Use the credentials below to log in:
                </p>
                
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px;"><strong>Login ID:</strong> ${credentials.loginId}</p>
                    <p style="margin: 0 0 10px;"><strong>Email:</strong> ${credentials.email}</p>
                    <p style="margin: 0; color: #d97706;"><strong>Temporary Password:</strong> ${credentials.password}</p>
                </div>
                
                <p style="color: #ef4444; font-size: 14px;">
                    ⚠️ Please change your password after first login.
                </p>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated message from Dayflow HRMS.
            </p>
        </div>
    `;

    return sendEmail(employee.email, 'Welcome to Dayflow - Your Login Credentials', html);
};

// Leave status update email
const sendLeaveStatusEmail = async (employee, leaveRequest, status) => {
    const statusColors = {
        APPROVED: '#059669',
        REJECTED: '#dc2626'
    };

    const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4f46e5; margin: 0;">⚡ Dayflow</h1>
            </div>
            
            <div style="background: #f9fafb; border-radius: 12px; padding: 30px;">
                <h2 style="color: #111827; margin: 0 0 20px;">Leave Request ${status}</h2>
                <p style="color: #4b5563; line-height: 1.6;">
                    Hi ${employee.firstName}, your leave request has been 
                    <span style="color: ${statusColors[status] || '#4b5563'}; font-weight: 600;">${status.toLowerCase()}</span>.
                </p>
                
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px;"><strong>Type:</strong> ${leaveRequest.type}</p>
                    <p style="margin: 0 0 10px;"><strong>From:</strong> ${new Date(leaveRequest.startDate).toLocaleDateString()}</p>
                    <p style="margin: 0;"><strong>To:</strong> ${new Date(leaveRequest.endDate).toLocaleDateString()}</p>
                </div>
                
                ${leaveRequest.adminComment ? `
                    <p style="color: #4b5563;"><strong>Comment:</strong> ${leaveRequest.adminComment}</p>
                ` : ''}
            </div>
        </div>
    `;

    return sendEmail(employee.email, `Leave Request ${status} - Dayflow`, html);
};

// Salary slip email
const sendPayslipEmail = async (employee, payroll, pdfBuffer) => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log('📧 Payslip email skipped (SMTP not configured)');
            return { success: false, reason: 'SMTP not configured' };
        }

        const transporter = createTransporter();

        const html = `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4f46e5; margin: 0;">⚡ Dayflow</h1>
                </div>
                
                <div style="background: #f9fafb; border-radius: 12px; padding: 30px;">
                    <h2 style="color: #111827; margin: 0 0 20px;">Salary Slip - ${payroll.month}/${payroll.year}</h2>
                    <p style="color: #4b5563; line-height: 1.6;">
                        Hi ${employee.firstName}, please find your salary slip attached.
                    </p>
                    
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #059669;">
                            ₹${payroll.netSalary?.toLocaleString()}
                        </p>
                        <p style="margin: 5px 0 0; color: #6b7280;">Net Salary</p>
                    </div>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"Dayflow HRMS" <${process.env.SMTP_USER}>`,
            to: employee.email,
            subject: `Salary Slip - ${payroll.month}/${payroll.year} - Dayflow`,
            html,
            attachments: [{
                filename: `Salary_Slip_${payroll.month}_${payroll.year}.pdf`,
                content: pdfBuffer
            }]
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('📧 Payslip email error:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendLeaveStatusEmail,
    sendPayslipEmail
};
