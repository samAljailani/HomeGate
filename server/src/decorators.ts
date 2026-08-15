import { SetMetadata } from '@nestjs/common'
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator'
import { ScheduledTasks } from './types/enums'

export const IS_PUBLIC = 'isPublic'
export const IS_ADMIN = 'isAdmin'
export const TASK = 'task'

export const Public = () => SetMetadata(IS_PUBLIC, true)
export const AdminRoute = () => SetMetadata(IS_ADMIN, true)

export const Task = (name: ScheduledTasks) => SetMetadata(TASK, name)

export function AtLeastOneField(fields: string[], validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'atLeastOneField',
            target: object.constructor,
            propertyName,
            constraints: [fields],
            options: {
                message: `At least one of [${fields.join(', ')}] must be provided`,
                ...validationOptions,
            },
            validator: {
                validate(_: unknown, args: ValidationArguments) {
                    const obj = args.object as Record<string, unknown>
                    const [requiredFields] = args.constraints as [string[]]
                    return requiredFields.some((field) => {
                        const val = obj[field]
                        return val != null && val !== ''
                    })
                },
            },
        })
    }
}
