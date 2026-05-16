'use client'

import { UsernameGenerator } from '@/utils/usernameGenerator'
import { useCallback, useRef } from 'react'

let sharedGenerator: UsernameGenerator | null = null

function getSharedGenerator(): UsernameGenerator {
	if (!sharedGenerator) {
		sharedGenerator = new UsernameGenerator()
	}

	return sharedGenerator
}

export function useUsernameGenerator() {
	const localGeneratorRef = useRef<UsernameGenerator | null>(null)

	const getGenerator = useCallback((): UsernameGenerator => {
		if (!localGeneratorRef.current) {
			localGeneratorRef.current = getSharedGenerator()
		}

		return localGeneratorRef.current
	}, [])

	const generateUsername = useCallback((): string => {
		return getGenerator().generate_username()
	}, [getGenerator])

	const generateMultiple = useCallback(
		(count: number): string[] => {
			return getGenerator().generate_multiple(count)
		},
		[getGenerator],
	)

	return {
		generateUsername,
		generateMultiple,
		loading: false,
		isWasmSupported: false,
	}
}
