const fs = require('fs');
const path = require('path');

console.log('Building username generator...');

const outputDir = path.join(__dirname, '../apps/web/public/wasm');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('Created wasm directory');
}

const jsGenerator = `// JavaScript Username Generator
console.log('Username Generator loaded');

const adjectives = [
    'Quantum', 'Cyber', 'Digital', 'Virtual', 'Neo', 'Meta', 'Hyper', 'Ultra',
    'Alpha', 'Beta', 'Omega', 'Prime', 'Nova', 'Cosmic', 'Solar', 'Lunar',
    'Atomic', 'Crystal', 'Epic', 'Legend', 'Mythic', 'Ancient', 'Eternal',
    'Swift', 'Bright', 'Fierce', 'Gentle', 'Lucky', 'Mighty', 'Noble'
];

const nouns = [
    'Wolf', 'Eagle', 'Lion', 'Tiger', 'Dragon', 'Phoenix', 'Falcon', 'Hawk',
    'Panther', 'Fox', 'Bear', 'Shark', 'Rhino', 'Mammoth', 'Griffin',
    'Warrior', 'Hunter', 'Knight', 'Mage', 'Sage', 'Wizard', 'Ranger',
    'Ninja', 'Samurai', 'Viking', 'Gladiator', 'Champion', 'Hero'
];

const colors = [
    'Red', 'Blue', 'Green', 'Gold', 'Silver', 'Black', 'White', 'Purple',
    'Orange', 'Yellow', 'Cyan', 'Ruby', 'Sapphire', 'Emerald', 'Amber',
    'Crimson', 'Azure', 'Violet', 'Indigo', 'Bronze'
];

const patterns = [
    'Cyber', 'Neo', 'Meta', 'Hyper', 'Ultra', 'Mega', 'Super', 'Alpha',
    'Tech', 'Digital', 'Virtual', 'Quantum', 'Bio', 'Neuro'
];

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class UsernameGenerator {
    constructor() {
        console.log('🔧 UsernameGenerator instance created');
    }
    
    generate_username() {
        const template = randomItem([
            // Adjective + Noun
            () => randomItem(adjectives) + randomItem(nouns),
            // Color + Noun
            () => randomItem(colors) + randomItem(nouns),
            // Adjective + Color
            () => randomItem(adjectives) + randomItem(colors),
            // Pattern + Noun + Number
            () => randomItem(patterns) + randomItem(nouns) + randomNumber(10, 99),
            // Lowercase with underscore
            () => randomItem(adjectives).toLowerCase() + '_' + randomItem(nouns).toLowerCase(),
            // The + Adjective + Noun
            () => 'The' + randomItem(adjectives) + randomItem(nouns),
            // Color + Pattern + Number
            () => randomItem(colors) + randomItem(patterns) + randomNumber(100, 999),
            // Double Adjective
            () => randomItem(adjectives) + randomItem(adjectives).slice(0, 3)
        ]);
        
        const username = template();
        console.log('✨ Generated username:', username);
        return username;
    }
    
    generate_multiple(count) {
        const results = [];
        const actualCount = Math.min(count, 10);
        for (let i = 0; i < actualCount; i++) {
            results.push(this.generate_username());
        }
        return results;
    }
    
    free() {
        console.log('🧹 UsernameGenerator cleaned up');
    }
}

export function generate_username() {
    const generator = new UsernameGenerator();
    const username = generator.generate_username();
    generator.free();
    return username;
}

export async function init() {
    console.log('🚀 Username generator initialized');
    return {
        UsernameGenerator,
        generate_username
    };
}

// Default export for compatibility
export default init;

console.log('Username generator module ready');
`;

fs.writeFileSync(path.join(outputDir, 'username_generator.js'), jsGenerator);
console.log('Generated username_generator.js');

fs.writeFileSync(path.join(outputDir, 'username_generator.wasm'), '');
console.log('Created empty username_generator.wasm for compatibility');

console.log('Username generator build completed successfully!');
console.log('Files created in: apps/web/public/wasm/');