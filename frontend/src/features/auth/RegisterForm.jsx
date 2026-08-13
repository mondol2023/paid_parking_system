import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useServerErrors } from '@/hooks/useServerErrors';

// `password2` is required by the serializer — the old app never sent it, so
// registration could not succeed at all.
const FIELDS = ['username', 'email', 'first_name', 'last_name', 'password', 'password2'];

export function RegisterForm() {
  const { register: signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { username: '', email: '', first_name: '', last_name: '', password: '', password2: '' },
  });

  const { formError, apply, clear } = useServerErrors(setError, FIELDS);

  const onSubmit = async (values) => {
    clear();
    try {
      await signUp(values);
      toast.success('Account created. You are signed in.');
      navigate('/', { replace: true });
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
        {...register('username', { required: 'Choose a username.' })}
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email', { required: 'Enter your email address.' })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" autoComplete="given-name" error={errors.first_name?.message} {...register('first_name')} />
        <Input label="Last name" autoComplete="family-name" error={errors.last_name?.message} {...register('last_name')} />
      </div>

      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password?.message}
        {...register('password', {
          required: 'Choose a password.',
          minLength: { value: 8, message: 'Use at least 8 characters.' },
        })}
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.password2?.message}
        {...register('password2', {
          required: 'Repeat your password.',
          validate: (value) => value === watch('password') || 'The two passwords do not match.',
        })}
      />

      <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
        Create account
      </Button>
    </form>
  );
}
