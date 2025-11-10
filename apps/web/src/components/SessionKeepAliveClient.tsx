// apps/web/src/components/SessionKeepAliveClient.tsx
'use client'

import { useSessionKeepAlive } from '@/src/hooks/useSessionKeepAlive'

export default function SessionKeepAliveClient() {
	useSessionKeepAlive()
	return null
}
