import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useServerErrors } from '@/hooks/useServerErrors';

const FIELDS = ['username', 'password'];

export function LoginForm() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { username: '', password: '' } });

  const { formError, apply, clear } = useServerErrors(setError, FIELDS);

  const onSubmit = async (values) => {
    clear();
    try {
      const profile = await login(values);
      toast.success(`Welcome back, ${profile.username}.`);
      // ProtectedRoute stashed the URL the user was actually going to.
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (error) {
      apply(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Alert message={formError} />

      <Input
        label="Username"
        autoComplete="username"
        autoFocus
        error={errors.username?.message}
        {...register('username', { required: 'Enter your username.' })}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password', { required: 'Enter your password.' })}
      />

      <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
        Sign in
      </Button>
    </form>
  );
}
