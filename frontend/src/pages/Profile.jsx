import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'motion/react';
import { LogOut } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Feedback';
import { staggerChild, staggerParent } from '@/lib/motion';
import { useServerErrors } from '@/hooks/useServerErrors';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

const FIELDS = ['email', 'first_name', 'last_name'];

export default function Profile() {
  const { user, booting, updateProfile, logout } = useAuth();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ defaultValues: { email: '', first_name: '', last_name: '' } });

  const { formError, apply, clear } = useServerErrors(setError, FIELDS);

  // The profile arrives after the first render; seed the form when it does.
  useEffect(() => {
    if (user) {
      reset({ email: user.email ?? '', first_name: user.first_name ?? '', last_name: user.last_name ?? '' });
    }
  }, [user, reset]);

  const submit = handleSubmit(async (values) => {
    clear();
    try {
      const profile = await updateProfile(values);
      reset({ email: profile.email ?? '', first_name: profile.first_name ?? '', last_name: profile.last_name ?? '' });
      toast.success('Profile updated.');
    } catch (err) {
      apply(err);
    }
  });

  if (booting || !user) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading your profile" />
      </div>
    );
  }

  const initials = (user.first_name?.[0] ?? user.username?.[0] ?? '?').toUpperCase();

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account details. The username is fixed once the account is created."
        actions={
          <Button variant="ghost" onClick={logout}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="flex flex-col items-center p-6 text-center">
          <span
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-full bg-accent-soft font-display text-2xl font-semibold text-ink"
          >
            {initials}
          </span>
          <p className="mt-3 font-display text-lg font-semibold tracking-tight text-ink">
            {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
          </p>
          <p className="mt-0.5 text-sm text-muted">@{user.username}</p>
        </Card>

        <Card className="p-5">
          <motion.form
            onSubmit={submit}
            variants={staggerParent}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-4"
          >
            <motion.div variants={staggerChild}>
              <Alert message={formError} />
            </motion.div>

            <motion.div variants={staggerChild}>
              <Input label="Username" name="username" value={user.username} readOnly disabled />
            </motion.div>

            <motion.div variants={staggerChild}>
              <Input
                label="Email"
                type="email"
                required
                error={errors.email?.message}
                {...register('email', {
                  required: 'An email is required.',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' },
                })}
              />
            </motion.div>

            <motion.div variants={staggerChild} className="grid gap-4 sm:grid-cols-2">
              <Input label="First name" error={errors.first_name?.message} {...register('first_name')} />
              <Input label="Last name" error={errors.last_name?.message} {...register('last_name')} />
            </motion.div>

            <motion.div variants={staggerChild} className="flex justify-end">
              <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty}>
                Save changes
              </Button>
            </motion.div>
          </motion.form>
        </Card>
      </div>
    </>
  );
}
