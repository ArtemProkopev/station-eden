import { useState, useCallback, useEffect, useRef } from 'react'

interface UsernameGeneratorInstance {
    generate_username(): string
    generate_multiple(count: number): string[]
    free?(): void
}

interface WasmModule {
    UsernameGenerator: new () => UsernameGeneratorInstance
    generate_username(): string
}

export function useUsernameGenerator() {
    const [wasm, setWasm] = useState<WasmModule | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [wasmAvailable, setWasmAvailable] = useState(false)
    const generatorRef = useRef<UsernameGeneratorInstance | null>(null)

    useEffect(() => {
        const loadWasm = async () => {
            try {
                setLoading(true)
                
                if (typeof WebAssembly === 'undefined') {
                    throw new Error('WebAssembly не поддерживается в этом браузере')
                }

                const wasmModule = await import(/* @vite-ignore */ 'public/wasm/username_generator.js') as any
                
                console.log('WASM module loaded:', wasmModule);

                // Пробуем инициализировать через init()
                if (wasmModule.init && typeof wasmModule.init === 'function') {
                    const instance = await wasmModule.init()
                    setWasm(instance)
                    setWasmAvailable(true)
                    generatorRef.current = new instance.UsernameGenerator()
                } 
                // Или используем напрямую
                else if (wasmModule.UsernameGenerator) {
                    setWasm(wasmModule)
                    setWasmAvailable(true)
                    generatorRef.current = new wasmModule.UsernameGenerator()
                } 
                // Или используем default export
                else if (wasmModule.default) {
                    const instance = await wasmModule.default()
                    setWasm(instance)
                    setWasmAvailable(true)
                    generatorRef.current = new instance.UsernameGenerator()
                }
                else {
                    throw new Error('Invalid WASM module format')
                }
                
                setError(null)
                console.log('WASM initialized successfully');
                
            } catch (err) {
                console.warn('WASM load failed, using fallback:', err)
                setWasmAvailable(false)
                setError('WASM недоступен, используется резервный генератор')
                generatorRef.current = createFallbackGenerator()
            } finally {
                setLoading(false)
            }
        }

        loadWasm()

        return () => {
            if (generatorRef.current?.free) {
                generatorRef.current.free()
            }
        }
    }, [])

    const generateUsername = useCallback((): string => {
        if (generatorRef.current) {
            try {
                return generatorRef.current.generate_username()
            } catch (err) {
                console.error('Error generating username:', err)
            }
        }
        return generateFallbackUsername()
    }, [])

    const generateMultiple = useCallback((count: number): string[] => {
        if (generatorRef.current && count <= 10) {
            try {
                return generatorRef.current.generate_multiple(count)
            } catch (err) {
                console.error('Error generating multiple usernames:', err)
            }
        }
        return Array.from({ length: Math.min(count, 10) }, () => generateFallbackUsername())
    }, [])

    return {
        generateUsername,
        generateMultiple,
        loading,
        error,
        isWasmSupported: wasmAvailable
    }
}

function createFallbackGenerator(): UsernameGeneratorInstance {
    return {
        generate_username: generateFallbackUsername,
        generate_multiple: (count: number) => 
            Array.from({ length: Math.min(count, 10) }, generateFallbackUsername)
    }
}

function generateFallbackUsername(): string {
    const adjectives = [
        'Quantum', 'Cyber', 'Digital', 'Virtual', 'Neo', 'Meta', 'Hyper', 'Ultra',
        'Alpha', 'Beta', 'Omega', 'Prime', 'Nova', 'Cosmic', 'Solar', 'Lunar'
    ]
    
    const nouns = [
        'Wolf', 'Eagle', 'Lion', 'Tiger', 'Dragon', 'Phoenix', 'Falcon', 'Hawk',
        'Panther', 'Fox', 'Bear', 'Shark', 'Rhino', 'Mammoth', 'Griffin'
    ]
    
    const patterns = [
        () => `${randomItem(adjectives)}${randomItem(nouns)}`,
        () => `Cyber${randomItem(nouns)}${randomNumber(10, 99)}`,
        () => `${randomItem(adjectives).toLowerCase()}_${randomItem(nouns).toLowerCase()}`,
        () => `Quantum${randomItem(nouns)}${randomNumber(100, 999)}`
    ]
    
    return patterns[Math.floor(Math.random() * patterns.length)]()
}

function randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
}

function randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}