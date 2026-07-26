import { SystemConfigKey, SystemConfigMap } from '@/types/models/SystemConfig'

export abstract class ISystemMetadataRepository {
    abstract get<K extends SystemConfigKey>(key: K): Promise<SystemConfigMap[K]>
    abstract set<K extends SystemConfigKey>(key: K, value: SystemConfigMap[K]): Promise<void>
}
