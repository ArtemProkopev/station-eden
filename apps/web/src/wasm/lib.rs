use wasm_bindgen::prelude::*;
use rand::seq::SliceRandom;
use rand::Rng;

#[wasm_bindgen]
pub fn init_random() {
}

#[wasm_bindgen]
pub struct UsernameGenerator {
    rng: rand::rngs::ThreadRng,
}

#[wasm_bindgen]
impl UsernameGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            rng: rand::thread_rng(),
        }
    }

    #[wasm_bindgen]
    pub fn generate_username(&mut self) -> String {
        let adjectives = &[
            "Cool", "Smart", "Fast", "Brave", "Wise", "Kind", "Bold", "Calm", 
            "Swift", "Bright", "Clear", "Deep", "Fierce", "Gentle", "Happy",
            "Iron", "Jolly", "Lucky", "Mighty", "Noble", "Quick", "Royal",
            "Silent", "True", "Wild", "Young", "Ancient", "Burning", "Crimson",
            "Dancing", "Eternal", "Flying", "Golden", "Hidden", "Infinite"
        ];
        
        let nouns = &[
            "Wolf", "Eagle", "Lion", "Tiger", "Bear", "Fox", "Hawk", "Owl",
            "Falcon", "Panther", "Dragon", "Phoenix", "Raven", "Shark", "Turtle",
            "Falcon", "Wolf", "Tiger", "Eagle", "Lion", "Fox", "Bear", "Hawk",
            "Storm", "Blade", "Shadow", "Spirit", "Hunter", "Walker", "Rider",
            "Knight", "Mage", "Warrior", "Archer", "Sage", "Coder", "Builder"
        ];
        
        let colors = &[
            "Red", "Blue", "Green", "Gold", "Silver", "Black", "White", "Purple",
            "Orange", "Yellow", "Cyan", "Ruby", "Sapphire", "Emerald", "Amber",
            "Crimson", "Azure", "Violet", "Indigo", "Bronze", "Copper", "Steel"
        ];
        
        let styles = &[
            "Cyber", "Neo", "Meta", "Hyper", "Ultra", "Mega", "Super", "Alpha",
            "Beta", "Omega", "Prime", "Nova", "Quantum", "Digital", "Virtual"
        ];

        let pattern = self.rng.gen_range(0..8);
        
        match pattern {
            0 => format!("{}{}", 
                adjectives.choose(&mut self.rng).unwrap(),
                nouns.choose(&mut self.rng).unwrap()
            ),
            1 => format!("{}{}", 
                colors.choose(&mut self.rng).unwrap(),
                nouns.choose(&mut self.rng).unwrap()
            ),
            2 => format!("{}{}", 
                adjectives.choose(&mut self.rng).unwrap(),
                colors.choose(&mut self.rng).unwrap()
            ),
            3 => format!("{}{}{}", 
                adjectives.choose(&mut self.rng).unwrap(),
                colors.choose(&mut self.rng).unwrap(),
                self.rng.gen_range(100..1000)
            ),
            4 => format!("The{}{}", 
                adjectives.choose(&mut self.rng).unwrap(),
                nouns.choose(&mut self.rng).unwrap()
            ),
            5 => format!("{}{}{}", 
                styles.choose(&mut self.rng).unwrap(),
                nouns.choose(&mut self.rng).unwrap(),
                self.rng.gen_range(10..100)
            ),
            6 => format!("{}_{}", 
                adjectives.choose(&mut self.rng).unwrap().to_lowercase(),
                nouns.choose(&mut self.rng).unwrap().to_lowercase()
            ),
            7 => format!("{}{}{}", 
                colors.choose(&mut self.rng).unwrap(),
                styles.choose(&mut self.rng).unwrap(),
                self.rng.gen_range(1000..10000)
            ),
            _ => format!("User{}", self.rng.gen_range(10000..100000))
        }
    }

    #[wasm_bindgen]
    pub fn generate_multiple(&mut self, count: usize) -> Vec<JsValue> {
        (0..count)
            .map(|_| JsValue::from(self.generate_username()))
            .collect()
    }
}

#[wasm_bindgen]
pub fn generate_username() -> String {
    let mut generator = UsernameGenerator::new();
    generator.generate_username()
}