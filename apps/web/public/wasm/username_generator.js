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
        console.log('UsernameGenerator instance created');
    }
    
    generate_username() {
        const template = randomItem([
            () => randomItem(adjectives) + randomItem(nouns),
            () => randomItem(colors) + randomItem(nouns),
            () => randomItem(adjectives) + randomItem(colors),
            () => randomItem(patterns) + randomItem(nouns) + randomNumber(10, 99),
            () => randomItem(adjectives).toLowerCase() + '_' + randomItem(nouns).toLowerCase(),
            () => 'The' + randomItem(adjectives) + randomItem(nouns),
            () => randomItem(colors) + randomItem(patterns) + randomNumber(100, 999),
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
        console.log('UsernameGenerator cleaned up');
    }
}

export function generate_username() {
    const generator = new UsernameGenerator();
    const username = generator.generate_username();
    generator.free();
    return username;
}

export async function init() {
    return {
        UsernameGenerator,
        generate_username
    };
}

export default init;

