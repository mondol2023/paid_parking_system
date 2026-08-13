import { Link } from 'react-router-dom';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { RegisterForm } from '@/features/auth/RegisterForm';

export default function Register() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register a vehicle once, then book a bay in a couple of taps."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
