import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Dayflow - Human Resource Management System",
  description: "Every workday, perfectly aligned. A modern HRMS for attendance, leave management, and payroll.",
  keywords: "HRMS, HR, Human Resources, Attendance, Leave Management, Payroll",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" style={{ scrollBehavior: 'smooth' }}>
      <body className={inter.variable}>
        <AuthProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
