import { useForm, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DevCredentialsWidget from '@/components/DevCredentialsWidget';

export default function Login() {
  const { appEnv } = usePage().props as { appEnv: string };
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
  });
  const shouldAutoSubmit = useRef(false);

  useEffect(() => {
    // Auto-submit after data has been set
    if (shouldAutoSubmit.current && data.email && data.password) {
      shouldAutoSubmit.current = false;
      post('/login');
    }
  }, [data.email, data.password]);

  const handleSelectUser = (email: string, password: string) => {
    shouldAutoSubmit.current = true;
    setData({
      email,
      password,
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    post('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to AI Data Lake
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="Email address"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
              />
              {errors.email && <div className="text-red-500 text-sm">{errors.email}</div>}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
              />
              {errors.password && <div className="text-red-500 text-sm">{errors.password}</div>}
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={processing}
              className="w-full"
            >
              Sign in
            </Button>
          </div>
        </form>

        {(appEnv === 'local' || appEnv === 'development') && (
          <DevCredentialsWidget onSelectUser={handleSelectUser} />
        )}
      </div>
    </div>
  );
}


