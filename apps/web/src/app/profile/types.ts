import { User } from '@station-eden/shared'

export interface ProfileIconsStatus {
	planet: boolean
	polygon: boolean
	copy: boolean
}

export interface ProfileState {
	status: 'loading' | 'error' | 'ok' | 'unauth'
	message?: string
	data?: User
}
