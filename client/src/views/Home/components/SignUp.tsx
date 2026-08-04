"use client"

import * as React from "react"

import { useForm, SubmitHandler, UseFormRegister, UseFormWatch } from "react-hook-form"
import { addToastMessage, cn } from "@/lib/utils"
import { ResponsiveModal } from "@/components/ResponsiveModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubscriptionCreateRequestDto, subscriptionService} from "@/services/subscription.service"
import { serviceSignUpConstants } from "@/constants/forms"

interface DrawerDialogDemoProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  serviceId: number
}

export function SignUpForm({ open, setOpen, serviceId }: DrawerDialogDemoProps) {
  return (
    <ResponsiveModal
      open={open}
      setOpen={setOpen}
      title="Sign Up"
      description="Create your account credentials for this service."
    >
      <Form serviceId={serviceId} setOpen={setOpen} />
    </ResponsiveModal>
  )
}

function Form({ className, serviceId, setOpen }: React.ComponentProps<"form"> & { serviceId: number, setOpen: React.Dispatch<React.SetStateAction<boolean>> }) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<SubscriptionCreateRequestDto>({ defaultValues: { serviceId } })

  const signUpForm = signUpFormValidator(register, watch)

  const onSubmit: SubmitHandler<SubscriptionCreateRequestDto> = async (data) => {
    try{
      await subscriptionService.subscribe(data)
      addToastMessage('success', "subscription successfully created.")
      setOpen(false)
    }catch(error){
      const message = "failed to create subscription. Verify the validity of the inserted information."
      setError('root', { message })
      addToastMessage('error', "failed to create subscription. Verify the validity of the inserted information.")
    }
  }

  return (
    <form className={cn("grid items-start gap-6", className)} onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("serviceId", { valueAsNumber: true })} />
      <div className="grid gap-3">
        <Label htmlFor="email">Email</Label>
        <Input type="email" id="email" defaultValue="home.gate@example.com" {...signUpForm.email} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="grid gap-3">
        <Label htmlFor="username">Username</Label>
        <Input id="username" defaultValue="homegate" {...signUpForm.username} />
        {errors.serviceUsername && <p className="text-sm text-destructive">{errors.serviceUsername.message}</p>}
      </div>
      <div className="grid gap-3">
        <Label htmlFor="password">Password</Label>
        <Input type="password" id="password" {...signUpForm.password} />
        {errors.servicePassword && <p className="text-sm text-destructive">{errors.servicePassword.message}</p>}
      </div>
      <div className="grid gap-3">
        <Label htmlFor="confirmed-password">Confirm Password</Label>
        <Input type="password" id="confirmed-password" {...signUpForm.confirmPassword} />
        {errors.confirmServicePassword && <p className="text-sm text-destructive">{errors.confirmServicePassword.message}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Input type="checkbox" id="auto-renew" name="auto-renew" value="true" defaultChecked className="h-4 w-4 shrink-0" />
        <Label htmlFor="auto-renew">Auto Renew</Label>
      </div>
      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
      <Button type="submit">Save</Button>

    </form>
  )
}

const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i

function signUpFormValidator(
  register: UseFormRegister<SubscriptionCreateRequestDto>,
  watch: UseFormWatch<SubscriptionCreateRequestDto>
){
  function validateEmail(email: string | undefined){
    if (!email) return true
    return emailRegex.test(email) || 'Email is invalid'
  }

  function validatePassword(password: string){
    if (!/[a-z]/i.test(password)) return 'Password must contain a letter'
    if (!/\d/.test(password)) return 'Password must contain a number'
    return true
  }

  function validateConfirmedPassword(confirmedPassword: string){
    return confirmedPassword === watch('servicePassword') || 'Passwords do not match'
  }

  return{
    email: register('email', {
      maxLength: {
        value: serviceSignUpConstants.maxEmailLength,
        message: `Email must be ${serviceSignUpConstants.maxEmailLength} characters or fewer`,
      },
      validate: validateEmail
    }),
    username: register('serviceUsername', {
      required: 'username is required', 
      minLength: {
        value: serviceSignUpConstants.minUsernameLength,
        message: `Username must be at least ${serviceSignUpConstants.minUsernameLength} characters`,
      },
      maxLength: {
        value: serviceSignUpConstants.maxUsernameLength,
        message: `Username must be ${serviceSignUpConstants.maxUsernameLength} characters or fewer`,
      },
    }), 
    password: register('servicePassword', {
      required: 'password is required',
      minLength: {
        value: serviceSignUpConstants.minPasswordLength,
        message: `Password must be at least ${serviceSignUpConstants.minPasswordLength} characters`,
      },
      maxLength: {
        value: serviceSignUpConstants.maxPasswordLength,
        message: `Password must be ${serviceSignUpConstants.maxPasswordLength} characters or fewer`,
      },
      validate: validatePassword
    }),
    confirmPassword: register('confirmServicePassword', {
      required: 'Confirm your password',
      validate: validateConfirmedPassword
    })
  }
}
