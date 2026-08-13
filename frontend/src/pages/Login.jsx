import { Link } from 'react-router-dom';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { LoginForm } from '@/features/auth/LoginForm';

export default function Login() {
  return (
    <AuthLayout
      title="Sign in"
      subtitle="Pick up where you left off — your bays, bookings and balances."
      footer={
        <>
          No account yet?{' '}
          <Link to="/register" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
