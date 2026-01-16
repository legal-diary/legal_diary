'use client';

import { Button } from 'antd';
import { useRouter } from 'next/navigation';
import { CalendarOutlined, FileTextOutlined, RobotOutlined, SafetyOutlined } from '@ant-design/icons';
import styles from '../landing.module.css';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className={styles.landing}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>Legal Diary</h1>
          <div className={styles.headerButtons}>
            <Button type="text" onClick={() => router.push('/login')}>
              Sign In
            </Button>
            <Button type="primary" onClick={() => router.push('/register')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h2 className={styles.heroTitle}>
            Your Complete Legal Practice Management Solution
          </h2>
          <p className={styles.heroSubtitle}>
            Legal Diary is a comprehensive case management system designed specifically for law firms
            and legal practitioners. Streamline your daily tasks, manage court hearings, track cases,
            and leverage AI-powered insights—all in one professional platform.
          </p>
          <div className={styles.heroButtons}>
            <Button
              type="primary"
              size="large"
              onClick={() => router.push('/register')}
            >
              Start Free Trial
            </Button>
            <Button
              size="large"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <h3 className={styles.sectionTitle}>Why Legal Diary?</h3>
        <p className={styles.sectionSubtitle}>
          Everything you need to manage your legal practice efficiently
        </p>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <CalendarOutlined className={styles.featureIcon} />
            <h4>Daily Legal Referencer</h4>
            <p>
              View today's schedule at a glance with previous dates, next hearing dates,
              court details, and case positions. Never miss a hearing with Google Calendar integration.
            </p>
          </div>

          <div className={styles.featureCard}>
            <FileTextOutlined className={styles.featureIcon} />
            <h4>Case Management</h4>
            <p>
              Organize all your cases with client information, case documents, hearing history,
              and opponent details. Upload and manage case files securely in one place.
            </p>
          </div>

          <div className={styles.featureCard}>
            <RobotOutlined className={styles.featureIcon} />
            <h4>AI-Powered Analysis</h4>
            <p>
              Leverage OpenAI GPT-4o to analyze case documents, generate summaries,
              identify key points, and get intelligent insights about your cases.
            </p>
          </div>

          <div className={styles.featureCard}>
            <SafetyOutlined className={styles.featureIcon} />
            <h4>Secure & Professional</h4>
            <p>
              Enterprise-grade security with JWT authentication, firm-scoped data access,
              and encrypted storage. Your client data stays private and protected.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.howItWorks}>
        <h3 className={styles.sectionTitle}>How It Works</h3>
        <div className={styles.stepsContainer}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h4>Create Your Account</h4>
            <p>Sign up with your law firm details and start your free trial</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h4>Add Your Cases</h4>
            <p>Import existing cases or create new ones with all relevant details</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h4>Schedule Hearings</h4>
            <p>Manage all court dates with automatic Google Calendar sync</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <h4>Stay Organized</h4>
            <p>Track everything from your daily dashboard and never miss updates</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <h3>Ready to Transform Your Legal Practice?</h3>
        <p>Join legal professionals who trust Legal Diary for their case management</p>
        <Button
          type="primary"
          size="large"
          onClick={() => router.push('/register')}
        >
          Get Started Today
        </Button>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>Legal Diary</h4>
            <p>Professional case management for modern law firms</p>
          </div>
          <div className={styles.footerSection}>
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="/login">Sign In</a></li>
              <li><a href="/register">Register</a></li>
            </ul>
          </div>
          <div className={styles.footerSection}>
            <h4>Legal</h4>
            <ul>
              <li><a href="/privacy-policy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
            </ul>
          </div>
          <div className={styles.footerSection}>
            <h4>Support</h4>
            <ul>
              <li><a href="mailto:support@legaldiary.com">Contact Us</a></li>
              <li><a href="mailto:siddharthrj4444@gmail.com">Developer</a></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; 2026 Legal Diary. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
