import { ApiProperty } from '@nestjs/swagger'

export class DashboardUsersDto {
    @ApiProperty({ type: Number })
    total!: number

    @ApiProperty({ type: Number })
    active!: number

    @ApiProperty({ type: Number })
    pending!: number

    @ApiProperty({ type: Number })
    disabled!: number
}

export class DashboardSessionsDto {
    @ApiProperty({ type: Number })
    active!: number

    @ApiProperty({ type: Number })
    expired!: number
}

export class DashboardSubscriptionsDto {
    @ApiProperty({ type: Number })
    total!: number

    @ApiProperty({ type: Number })
    active!: number
}

export class DashboardTasksDto {
    @ApiProperty({ type: Number })
    total!: number

    @ApiProperty({ type: Number, description: 'Tasks whose most recent run failed' })
    failing!: number
}

export class DashboardErrorDto {
    @ApiProperty({ type: Number })
    id!: number

    @ApiProperty({ type: String })
    message!: string

    @ApiProperty({ type: String, nullable: true })
    context!: string | null

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt!: Date
}

export class DashboardStatsResponseDto {
    @ApiProperty({ type: () => DashboardUsersDto })
    users!: DashboardUsersDto

    @ApiProperty({ type: () => DashboardSessionsDto })
    sessions!: DashboardSessionsDto

    @ApiProperty({ type: () => DashboardSubscriptionsDto })
    subscriptions!: DashboardSubscriptionsDto

    @ApiProperty({ type: () => DashboardTasksDto })
    tasks!: DashboardTasksDto

    @ApiProperty({ type: () => [DashboardErrorDto] })
    recentErrors!: DashboardErrorDto[]
}
