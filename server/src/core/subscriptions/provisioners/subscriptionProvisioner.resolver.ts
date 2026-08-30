import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common'
import { AccountType } from '@/types/enums'
import { ServiceModel } from '@/types/models/service'
import { ISubscriptionProvisioner } from './ISubscriptionProvisioner'
import { ManagedAccountProvisioner } from './managedAccount.provisioner'
import { ReferencedAccountProvisioner } from './referencedAccount.provisioner'
import { NoAccountProvisioner } from './noAccount.provisioner'

@Injectable()
export class SubscriptionProvisionerResolver {
    private readonly byAccountType: ReadonlyMap<AccountType, ISubscriptionProvisioner>

    constructor(
        @Inject(ManagedAccountProvisioner) managed: ManagedAccountProvisioner,
        @Inject(ReferencedAccountProvisioner) referenced: ReferencedAccountProvisioner,
        @Inject(NoAccountProvisioner) none: NoAccountProvisioner
    ) {
        this.byAccountType = new Map<AccountType, ISubscriptionProvisioner>([
            [managed.accountType, managed],
            [referenced.accountType, referenced],
            [none.accountType, none],
        ])
    }

    resolve(service: Pick<ServiceModel, 'accountType'>): ISubscriptionProvisioner {
        const provisioner = this.byAccountType.get(service.accountType)

        if (!provisioner) {
            throw new InternalServerErrorException(`No provisioner registered for account type '${service.accountType}'`)
        }

        return provisioner
    }
}
