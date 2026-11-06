import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Footprints, AlertCircle, LogIn } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

import { useAuth } from '../context/AuthContext';
import { Button } from '../../../shared/components/Button';
import { EmailInput, PassInput } from '../components/AuthInputs';

export const Login: React.FC = () => {
  const { loginUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      email: '',
      password: ''
    },
    mode: 'onChange'
  });

  const from = (location.state as any)?.from?.pathname || null;

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setErrorMessage('');
      const user = await loginWithGoogle(credentialResponse.access_token || credentialResponse.credential);
      const destination = user?.role === 'admin' ? '/admin/dashboard' : (from ?? '/');
      navigate(destination, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in gagal');
    }
  };

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setErrorMessage('Google Login dibatalkan atau gagal.'),
  });

  const onSubmit = async (data: any) => {
    setErrorMessage('');

    try {
      const user = await loginUser(data.email, data.password);
      const destination = user?.role === 'admin' ? '/admin/dashboard' : (from ?? '/');
      navigate(destination, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message);
      setValue("password", "");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment-DEFAULT px-4 py-12">
      <div className="relative w-full max-w-md">
        <div className="relative rounded-3xl p-8 shadow-2xl">

          {/* Header & Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 bg-parchment-100">
              <Footprints className="w-8 h-8 text-linen-600" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-wider font-headline text-parchment-100">StreetWear</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <EmailInput register={register} error={errors.email} isLogin={true} />

            <PassInput
              register={register}
              error={errors.password}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isLogin={true}
            />

            {errorMessage && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-label bg-red-100 text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button isLoading={isSubmitting} loadingText="Login..." icon={LogIn}>
              Login
            </Button>
          </form>

          {/* Social Login / Google OAuth2 */}
          <div className="mt-6">
            <div className="relative flex items-center justify-center mb-4">
              <div className="border-t border-parchment-200/20 w-full"></div>
              <span className="bg-parchment-DEFAULT px-3 text-xs text-parchment-300 font-label uppercase">
                Atau masuk dengan
              </span>
              <div className="border-t border-parchment-200/20 w-full"></div>
            </div>

            <button
              type="button"
              onClick={() => triggerGoogleLogin()}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-800 rounded-xl font-label font-bold text-xs shadow-md hover:bg-gray-50 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Lanjut dengan Google</span>
            </button>
          </div>

          {/* Footer Links */}
          <div className="flex justify-center items-center gap-2 mt-6 text-xs">
            <p className="font-label text-parchment-300">
              Belum punya akun?
            </p>
            <p>
              <Link to="/register" className="font-bold underline text-desert_sand-300">
                Daftar sekarang
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
