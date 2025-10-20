"use client";
import { useFindCompanyMutation, usePinLoginWithRoleMutation } from '@/lib/api/endpoints/authApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email().optional(),
  companyId: z.string().optional(),
  branchId: z.string().min(1, 'Branch is required'),
  role: z.string().min(1, 'Role is required'),
  pin: z.string().min(4, 'PIN must be at least 4 digits'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const [findCompany, { data: companyData, isLoading: finding } ] = useFindCompanyMutation()
  const [pinLogin, { isLoading: loggingIn }] = usePinLoginWithRoleMutation()
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onFindCompany = async () => {
    const email = watch('email')
    const companyId = watch('companyId')
    if (!email && !companyId) return
    await findCompany({ email: email || undefined, companyId: companyId || undefined })
  }

  const onSubmit = async (values: FormValues) => {
    if (!companyData?.companyId) return
    await pinLogin({ companyId: companyData.companyId, branchId: values.branchId!, role: values.role!, pin: values.pin })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md border rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-4">Login</h1>
        <div className="space-y-2">
          <input className="w-full border rounded p-2" placeholder="Email (or Company ID)" {...register('email')} />
          <div className="text-sm text-red-500">{errors.email?.message}</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">or</span>
            <input className="w-full border rounded p-2" placeholder="Company ID" {...register('companyId')} />
          </div>
          <button className="w-full border rounded p-2" onClick={onFindCompany} disabled={finding}>Find Company</button>
        </div>

        {companyData && (
          <div className="mt-4 space-y-2">
            <select className="w-full border rounded p-2" onChange={(e) => setValue('branchId', e.target.value)} defaultValue="">
              <option value="" disabled>Select Branch</option>
              {companyData.branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select className="w-full border rounded p-2" onChange={(e) => setValue('role', e.target.value)} defaultValue="">
              <option value="" disabled>Select Role</option>
              {(companyData.branches?.find((b: any) => b.id === watch('branchId'))?.availableRoles || []).map((r: string) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input className="w-full border rounded p-2" placeholder="PIN" type="password" {...register('pin')} />
            <div className="text-sm text-red-500">{errors.pin?.message}</div>
            <button className="w-full border rounded p-2" onClick={handleSubmit(onSubmit)} disabled={loggingIn}>Login</button>
          </div>
        )}
      </motion.div>
    </div>
  )
}


