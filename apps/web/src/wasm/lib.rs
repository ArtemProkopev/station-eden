use wasm_bindgen::prelude::*;
use core::num::Wrapping;

// ---- быстрый PRNG xoshiro128++ без зависимостей ----
#[derive(Clone)]
struct Xoshiro128 {
    s0: u32, s1: u32, s2: u32, s3: u32,
}
impl Xoshiro128 {
    fn from_seed(mut z: u64) -> Self {
        fn splitmix32(x: &mut u64) -> u32 {
            *x = x.wrapping_add(0x9E3779B97F4A7C15);
            let mut z = *x;
            z = (z ^ (z >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
            z = (z ^ (z >> 27)).wrapping_mul(0x94D049BB133111EB);
            ((z ^ (z >> 31)) & 0xFFFF_FFFF) as u32
        }
        Self {
            s0: splitmix32(&mut z),
            s1: splitmix32(&mut z),
            s2: splitmix32(&mut z),
            s3: splitmix32(&mut z),
        }
    }
    #[inline] fn rotl(x: u32, k: u32) -> u32 { (x << k) | (x >> (32 - k)) }
    #[inline] fn next_u32(&mut self) -> u32 {
        let result = Self::rotl(self.s0.wrapping_add(self.s3), 7).wrapping_add(self.s0);
        let t = self.s1 << 9;

        self.s2 ^= self.s0;
        self.s3 ^= self.s1;
        self.s1 ^= self.s2;
        self.s0 ^= self.s3;

        self.s2 ^= t;
        self.s3 = Self::rotl(self.s3, 11);
        result
    }
    #[inline] fn range(&mut self, upper: usize) -> usize {
        (self.next_u32() as u64 * (upper as u64) >> 32) as usize
    }
}

// ---- слоговая модель с весами ----
static ONSETS: &[(&str, u16)] = &[
    ("", 60), ("n", 50), ("v", 30), ("k", 50), ("m", 40), ("t", 50),
    ("l", 40), ("r", 40), ("s", 35), ("z", 25), ("x", 20),
    ("cr", 12), ("tr", 12), ("pr", 12), ("dr", 10), ("gr", 10),
    ("sh", 18), ("ch", 18), ("th", 5), ("sk", 10), ("gl", 10),
];

static NUCLEI: &[(&str, u16)] = &[
    ("a", 80), ("e", 85), ("i", 70), ("o", 75), ("u", 45), ("y", 20),
    ("ai", 25), ("ei", 22), ("oi", 18), ("au", 16), ("ou", 18), ("ia", 14),
    ("ar", 20), ("er", 20), ("or", 20), ("ir", 15), ("ur", 12),
];

static CODAE: &[(&str, u16)] = &[
    ("", 120), ("n", 60), ("r", 60), ("s", 55), ("x", 25),
    ("l", 40), ("m", 30), ("k", 35), ("t", 35), ("d", 25),
    ("th", 10), ("sh", 16), ("ch", 16), ("rd", 12), ("st", 18), ("x", 25),
];

#[inline]
fn pick_weighted<'a>(rng: &mut Xoshiro128, items: &'a [(&'a str, u16)]) -> &'a str {
    let total: u16 = items.iter().map(|(_, w)| *w).sum();
    let mut r = (rng.next_u32() % total as u32) as u16;
    for (s, w) in items {
        if r < *w { return s; }
        r -= *w;
    }
    items.last().map(|(s, _)| *s).unwrap_or("")
}

#[wasm_bindgen]
pub struct UsernameGenerator {
    rng: Xoshiro128,
    counter: Wrapping<u32>,
}

#[wasm_bindgen]
impl UsernameGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        // seed из Crypto, иначе Math.random
        let buf = js_sys::Uint32Array::new_with_length(2);
        let _ = web_sys::window()
            .and_then(|w| w.crypto().ok())
            .and_then(|c| c.get_random_values_with_array_buffer_view(&buf).ok());

        let s0 = if buf.length() == 2 { buf.get_index(0) as u64 } else { 0 };
        let s1 = if buf.length() == 2 { buf.get_index(1) as u64 } else { 0 };
        let seed = if (s0 | s1) == 0 {
            ((js_sys::Math::random() * (u32::MAX as f64)) as u64) ^ 0xA5A5_5A5A_1234_5678
        } else {
            (s0 << 32) | s1
        };

        Self { rng: Xoshiro128::from_seed(seed), counter: Wrapping(0) }
    }

    #[wasm_bindgen]
    pub fn generate_username(&mut self) -> String {
        let syllables = 2 + self.rng.range(2); // 2 или 3
        let mut out = String::with_capacity(14);

        for i in 0..syllables {
            let onset = pick_weighted(&mut self.rng, ONSETS);
            let nuc   = pick_weighted(&mut self.rng, NUCLEI);
            let coda  = pick_weighted(&mut self.rng, CODAE);

            if i == 0 {
                // Красивая заглавная первая буква
                if let Some(first) = onset.chars().next().or_else(|| nuc.chars().next()) {
                    out.push(first.to_ascii_uppercase());
                    out.push_str(&onset[first.len_utf8()..]);
                } else {
                    let mut chars = nuc.chars();
                    if let Some(f) = chars.next() {
                        out.push(f.to_ascii_uppercase());
                        out.push_str(chars.as_str());
                    }
                }
                out.push_str(nuc);
            } else {
                out.push_str(onset);
                out.push_str(nuc);
            }
            out.push_str(coda);
        }

        // 20% — аккуратный числовой суффикс
        if self.rng.range(5) == 0 {
            let n = (self.rng.next_u32() % 999) + 1;
            out.push_str(&n.to_string());
        }

        if out.ends_with('x') && out.len() < 6 {
            out.push('o');
        }
        out
    }

    #[wasm_bindgen]
    pub fn generate_multiple(&mut self, count: usize) -> js_sys::Array {
        let n = count.min(50);
        let arr = js_sys::Array::new_with_length(n as u32);
        for i in 0..n {
            let v = self.generate_username();
            arr.set(i as u32, JsValue::from(v));
        }
        arr
    }
}

#[wasm_bindgen]
pub fn generate_username() -> String {
    UsernameGenerator::new().generate_username()
}
