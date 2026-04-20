'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

const schema = z
  .object({
    displayName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
    role: z.enum(['STUDENT', 'TEACHER']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [error, setError] = useState('')
  const { register: registerUser, isLoading } = useAuthStore()
  const router = useRouter()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'STUDENT' },
  })

  const role = watch('role')

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        role: data.role,
      })
      const u = useAuthStore.getState().user
      router.push(u?.role === 'STUDENT' ? '/dashboard' : '/teacher/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Registration failed')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <h2 className="text-xl font-sans font-semibold tracking-tight text-nearblack">Create your account</h2>

      {error && <Alert type="error" message={error} />}

      <div className="space-y-2">
        <p className="text-sm font-medium text-charcoal">I am a...</p>
        <div className="flex gap-3">
          {(['STUDENT', 'TEACHER'] as const).map((r) => (
            <label
              key={r}
              className={`flex-1 flex items-center justify-center p-3 border-2 rounded-comfortable cursor-pointer transition-all duration-150 ${
                role === r
                  ? 'border-terracotta bg-terracotta/5'
                  : 'border-border-warm hover:border-ring-warm'
              }`}
            >
              <input type="radio" value={r} className="sr-only" {...register('role')} />
              <span className="text-sm font-medium text-charcoal">
                {r === 'STUDENT' ? 'Student' : 'Teacher'}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Input
        label="Full Name"
        placeholder="John Doe"
        error={errors.displayName?.message}
        {...register('displayName')}
      />

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="Min 8 chars, uppercase, number"
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Confirm Password"
        type="password"
        placeholder="Repeat password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button type="submit" loading={isLoading} className="w-full">
        Create Account
      </Button>

      <p className="text-center text-sm text-stone">
        Already have an account?{' '}
        <Link href="/login" className="text-terracotta hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  )
}
