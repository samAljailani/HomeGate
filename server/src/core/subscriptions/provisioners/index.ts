import { ManagedAccountProvisioner } from './managedAccount.provisioner'
import { ReferencedAccountProvisioner } from './referencedAccount.provisioner'
import { NoAccountProvisioner } from './noAccount.provisioner'
import { SubscriptionProvisionerResolver } from './subscriptionProvisioner.resolver'

export * from './ISubscriptionProvisioner'
export { ManagedAccountProvisioner } from './managedAccount.provisioner'
export { ReferencedAccountProvisioner } from './referencedAccount.provisioner'
export { NoAccountProvisioner } from './noAccount.provisioner'
export { SubscriptionProvisionerResolver } from './subscriptionProvisioner.resolver'

export const subscriptionProvisioners = [
    ManagedAccountProvisioner,
    ReferencedAccountProvisioner,
    NoAccountProvisioner,
    SubscriptionProvisionerResolver,
]
