import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Footprints, AlertCircle, UserPlus } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { NameField, EmailInput, PassInput } from '../components/AuthInputs';
import { Button } from '../../../shared/components/Button';

export const Register: React.FC = () => {
  const { registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onChange'
  });

  const from = (location.state as any)?.from?.pathname || null;

  const onSubmit = async (data: any) => {
    setErrorMessage('');

    try {
      const user = await registerUser(data.name, data.email, data.password);
      const destination = user?.role === 'admin' ? '/admin/dashboard' : (from ?? '/');
      navigate(destination, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message);
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
            <NameField register={register} error={errors.name} />
            <EmailInput register={register} error={errors.email} />
            <PassInput
              register={register}
              error={errors.password}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />

            {errorMessage && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-label bg-red-100 text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button isLoading={isSubmitting} loadingText="register..." icon={UserPlus}>
              Register
            </Button>
          </form>

          {/* Footer Links */}
          <div className="flex justify-center items-center gap-2 mt-6 text-xs">
            <p>
              <Link to="/login" className="font-bold underline text-desert_sand-300">
                Login Now
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;
