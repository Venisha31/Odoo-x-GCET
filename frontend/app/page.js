'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { useAuth } from './context/AuthContext';
import {
  FiClock,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiArrowRight,
  FiZap,
  FiShield,
  FiTrendingUp
} from 'react-icons/fi';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const features = [
    {
      icon: <FiUsers size={24} />,
      title: 'Employee Management',
      description: 'Comprehensive profiles with personal details, job information, and documents.'
    },
    {
      icon: <FiClock size={24} />,
      title: 'Attendance Tracking',
      description: 'Daily check-in/out with real-time tracking and work hours calculation.'
    },
    {
      icon: <FiCalendar size={24} />,
      title: 'Leave Management',
      description: 'Apply for leave, track requests, and manage approvals seamlessly.'
    },
    {
      icon: <FiDollarSign size={24} />,
      title: 'Payroll Visibility',
      description: 'View salary breakdown, allowances, and deductions transparently.'
    }
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        padding: 'var(--space-lg) var(--space-xl)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(234, 234, 244, 0.9)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
        borderBottom: '1px solid var(--border-color-light)'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <div style={{
  width: '100px',
  height: '60px',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden'
}}>
  <Image
    src="/imagee.png"
    alt="Dayflow Logo"
    width={2000}
    height={900}
    style={{ objectFit: 'contain' }}
  />
</div>

            
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <Link href="/auth/login" className="btn btn-ghost">
              Sign In
            </Link>
            <Link href="/auth/register" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-3xl) var(--space-xl)'
      }}>
        <div className="container fade-in">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-sm) var(--space-lg)',
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: 'var(--radius-full)',
            marginBottom: 'var(--space-xl)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--primary-light)'
          }}>
            <FiTrendingUp size={16} />
            Human Resource Management System
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 'var(--space-xl)'
          }}>
            Every workday,<br />
            <span className="text-gradient">perfectly aligned.</span>
          </h1>

          <p style={{
            fontSize: 'var(--font-size-lg)',
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '0 auto var(--space-2xl)'
          }}>
            Streamline your HR operations with Dayflow. From attendance tracking to
            leave management and payroll visibility — all in one platform.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <Link href="/auth/register" className="btn btn-primary btn-lg">
              Start Free <FiArrowRight size={18} />
            </Link>
            <Link href="/auth/login" className="btn btn-secondary btn-lg">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: 'var(--space-3xl) var(--space-xl)',
        background: 'var(--bg-secondary)'
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-md)' }}>
              Everything you need to manage HR
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
              Powerful features designed to simplify your daily HR operations
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-xl)'
          }}>
            {features.map((feature, index) => (
              <div
                key={index}
                className="card slide-up"
                style={{
                  animationDelay: `${index * 100}ms`,
                  textAlign: 'center'
                }}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                  borderRadius: 'var(--radius-xl)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-lg)',
                  color: 'white'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ marginBottom: 'var(--space-sm)' }}>{feature.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: 'var(--space-3xl) var(--space-xl)',
        textAlign: 'center'
      }}>
        <div className="container">
          <div className="glass-card" style={{
            padding: 'var(--space-3xl)',
            maxWidth: '800px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
          }}>
            <FiShield size={48} style={{ color: 'var(--primary)', marginBottom: 'var(--space-lg)' }} />
            <h2 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-md)' }}>
              Ready to transform your HR?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
              Join Dayflow today and experience modern human resource management.
            </p>
            <Link href="/auth/register" className="btn btn-primary btn-lg">
              Get Started for Free <FiArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: 'var(--space-xl)',
        borderTop: '1px solid var(--border-color-light)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: 'var(--font-size-sm)'
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FiZap size={16} />
            </div>
            <span style={{ fontWeight: 700 }} className="text-gradient">Dayflow</span>
          </div>
          <p>Dayflow HRMS - Built for Odoo Hackathon</p>
        </div>
      </footer>
    </div>
  );
}
