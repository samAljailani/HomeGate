'use client'

import * as React from 'react'

import {
    useForm,
    SubmitHandler,
    UseFormRegister,
    UseFormWatch,
} from 'react-hook-form'
import { addToastMessage, cn } from '@/lib/utils'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    SubscriptionCreateRequestDto,
    subscriptionService,
} from '@/services/subscription.service'
import { serviceSignUpConstants } from '@/constants/forms'
import type { ServiceResponseDto } from '@/services/service.service'

interface SignUpFormProps {
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    serviceId: number
    accountType?: ServiceResponseDto['accountType']
    requiredInputs?: ServiceResponseDto['requiredInputs']
    onSubscribed?: () => void
}

export function SignUpForm({ open, setOpen, serviceId, accountType, requiredInputs, onSubscribed }: SignUpFormProps) {
    const needsCredentials = accountType === 'MANAGED' && requiredInputs

    return (
        <ResponsiveModal
            open={open}
            setOpen={setOpen}
            title="Sign Up"
            description={
                needsCredentials
                    ? 'Create your account credentials for this service.'
                    : 'Subscribe to this service.'
            }
        >
            <Form
                serviceId={serviceId}
                setOpen={setOpen}
                onSubscribed={onSubscribed}
                requiredInputs={needsCredentials ? requiredInputs : undefined}
            />
        </ResponsiveModal>
    )
}

function Form({
    className,
    serviceId,
    setOpen,
    requiredInputs,
    onSubscribed,
}: React.ComponentProps<'form'> & {
    serviceId: number
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    requiredInputs?: ServiceResponseDto['requiredInputs']
    onSubscribed?: () => void
}) {
    const {
        register,
        handleSubmit,
        watch,
        setError,
        formState: { errors },
    } = useForm<SubscriptionCreateRequestDto>({ defaultValues: { serviceId } })

    const signUpForm = signUpFormValidator(register, watch, requiredInputs)

    const onSubmit: SubmitHandler<SubscriptionCreateRequestDto> = async (
        data
    ) => {
        try {
            await subscriptionService.subscribe(data)
            addToastMessage('success', 'subscription successfully created.')
            setOpen(false)
            onSubscribed?.()
        } catch {
            const message =
                'failed to create subscription. Verify the validity of the inserted information.'
            setError('root', { message })
        }
    }

    return (
        <form
            className={cn('grid items-start gap-6', className)}
            onSubmit={handleSubmit(onSubmit)}
        >
            <input
                type="hidden"
                {...register('serviceId', { valueAsNumber: true })}
            />
            {requiredInputs?.email && (
                <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        type="email"
                        id="email"
                        defaultValue="home.gate@example.com"
                        {...signUpForm.email}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">
                            {errors.email.message}
                        </p>
                    )}
                </div>
            )}
            {requiredInputs?.username && (
                <div className="grid gap-3">
                    <Label htmlFor="username">Username</Label>
                    <Input
                        id="username"
                        defaultValue="homegate"
                        {...signUpForm.username}
                    />
                    {errors.serviceUsername && (
                        <p className="text-sm text-destructive">
                            {errors.serviceUsername.message}
                        </p>
                    )}
                </div>
            )}
            {requiredInputs?.password && (
                <>
                    <div className="grid gap-3">
                        <Label htmlFor="password">Password</Label>
                        <Input type="password" id="password" {...signUpForm.password} />
                        {errors.servicePassword && (
                            <p className="text-sm text-destructive">
                                {errors.servicePassword.message}
                            </p>
                        )}
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="confirmed-password">Confirm Password</Label>
                        <Input
                            type="password"
                            id="confirmed-password"
                            {...signUpForm.confirmPassword}
                        />
                        {errors.confirmServicePassword && (
                            <p className="text-sm text-destructive">
                                {errors.confirmServicePassword.message}
                            </p>
                        )}
                    </div>
                </>
            )}
            <div className="flex items-center gap-2">
                <Input
                    type="checkbox"
                    id="auto-renew"
                    name="auto-renew"
                    value="true"
                    defaultChecked
                    className="h-4 w-4 shrink-0"
                />
                <Label htmlFor="auto-renew">Auto Renew</Label>
            </div>
            {errors.root && (
                <p className="text-sm text-destructive">
                    {errors.root.message}
                </p>
            )}
            <Button type="submit">Save</Button>
        </form>
    )
}

const emailRegex =
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i

function signUpFormValidator(
    register: UseFormRegister<SubscriptionCreateRequestDto>,
    watch: UseFormWatch<SubscriptionCreateRequestDto>,
    requiredInputs?: ServiceResponseDto['requiredInputs']
) {
    function validateEmail(email: string | undefined) {
        if (!email) return true
        return emailRegex.test(email) || 'Email is invalid'
    }

    function validatePassword(password: string) {
        if (!/[a-z]/i.test(password)) return 'Password must contain a letter'
        if (!/\d/.test(password)) return 'Password must contain a number'
        return true
    }

    function validateConfirmedPassword(confirmedPassword: string) {
        return (
            confirmedPassword === watch('servicePassword') ||
            'Passwords do not match'
        )
    }

    return {
        email: register('email', {
            maxLength: {
                value: serviceSignUpConstants.maxEmailLength,
                message: `Email must be ${serviceSignUpConstants.maxEmailLength} characters or fewer`,
            },
            validate: validateEmail,
        }),
        username: register('serviceUsername', {
            required: requiredInputs?.username ? 'username is required' : false,
            minLength: requiredInputs?.username
                ? {
                      value: serviceSignUpConstants.minUsernameLength,
                      message: `Username must be at least ${serviceSignUpConstants.minUsernameLength} characters`,
                  }
                : undefined,
            maxLength: requiredInputs?.username
                ? {
                      value: serviceSignUpConstants.maxUsernameLength,
                      message: `Username must be ${serviceSignUpConstants.maxUsernameLength} characters or fewer`,
                  }
                : undefined,
        }),
        password: register('servicePassword', {
            required: requiredInputs?.password ? 'password is required' : false,
            minLength: requiredInputs?.password
                ? {
                      value: serviceSignUpConstants.minPasswordLength,
                      message: `Password must be at least ${serviceSignUpConstants.minPasswordLength} characters`,
                  }
                : undefined,
            maxLength: requiredInputs?.password
                ? {
                      value: serviceSignUpConstants.maxPasswordLength,
                      message: `Password must be ${serviceSignUpConstants.maxPasswordLength} characters or fewer`,
                  }
                : undefined,
            validate: requiredInputs?.password ? validatePassword : undefined,
        }),
        confirmPassword: register('confirmServicePassword', {
            required: requiredInputs?.password ? 'Confirm your password' : false,
            validate: requiredInputs?.password ? validateConfirmedPassword : undefined,
        }),
    }
}
