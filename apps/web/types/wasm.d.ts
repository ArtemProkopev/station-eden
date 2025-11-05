declare module '*/wasm/username_generator.js' {
    export class UsernameGenerator {
        constructor();
        generate_username(): string;
        generate_multiple(count: number): string[];
        free(): void;
    }
    
    export function generate_username(): string;
    export function init(): Promise<{
        UsernameGenerator: typeof UsernameGenerator;
        generate_username: typeof generate_username;
    }>;
}

declare module '/wasm/username_generator.js' {
    export class UsernameGenerator {
        constructor();
        generate_username(): string;
        generate_multiple(count: number): string[];
        free(): void;
    }
    
    export function generate_username(): string;
    export function init(): Promise<{
        UsernameGenerator: typeof UsernameGenerator;
        generate_username: typeof generate_username;
    }>;
    
    export default function init(): Promise<{
        UsernameGenerator: typeof UsernameGenerator;
        generate_username: typeof generate_username;
    }>;
}