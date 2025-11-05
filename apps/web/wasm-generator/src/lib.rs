use std::alloc::Layout;

static mut SEED: u32 = 12345;

fn random() -> u32 {
    unsafe {
        SEED = SEED.wrapping_mul(1103515245).wrapping_add(12345);
        SEED
    }
}

fn random_range(min: usize, max: usize) -> usize {
    (random() as usize % (max - min)) + min
}

#[no_mangle]
pub extern "C" fn init_random() {
    unsafe {
        SEED = 12345;
    }
}

#[no_mangle]
pub extern "C" fn generate_username() -> *mut u8 {
    let adjectives = &[
        "Cool", "Smart", "Fast", "Brave", "Wise", "Kind", "Bold", "Calm",
    ];
    
    let nouns = &[
        "Wolf", "Eagle", "Lion", "Tiger", "Bear", "Fox", "Hawk", "Owl",
    ];
    
    let colors = &[
        "Red", "Blue", "Green", "Gold", "Silver", "Black", "White", "Purple",
    ];

    let pattern = random_range(0, 4);
    
    let username = match pattern {
        0 => format!("{}{}", 
            adjectives[random_range(0, adjectives.len())],
            nouns[random_range(0, nouns.len())]
        ),
        1 => format!("{}{}", 
            colors[random_range(0, colors.len())],
            nouns[random_range(0, nouns.len())]
        ),
        2 => format!("{}{}", 
            adjectives[random_range(0, adjectives.len())],
            colors[random_range(0, colors.len())]
        ),
        _ => format!("{}{}{}", 
            adjectives[random_range(0, adjectives.len())],
            nouns[random_range(0, nouns.len())],
            random_range(100, 1000)
        ),
    };

    let c_string = std::ffi::CString::new(username).unwrap();
    c_string.into_raw() as *mut u8
}

#[no_mangle]
pub extern "C" fn get_string_len(ptr: *const u8) -> usize {
    unsafe {
        let mut len = 0;
        while *ptr.add(len) != 0 {
            len += 1;
        }
        len
    }
}

#[no_mangle]
pub extern "C" fn free_string(ptr: *mut u8) {
    if !ptr.is_null() {
        unsafe {
            let _ = std::ffi::CString::from_raw(ptr as *mut i8);
        }
    }
}

#[no_mangle]
pub extern "C" fn allocate(size: usize) -> *mut u8 {
    let layout = Layout::from_size_align(size, 1).unwrap();
    unsafe { std::alloc::alloc(layout) }
}

#[no_mangle]
pub extern "C" fn deallocate(ptr: *mut u8, size: usize) {
    if !ptr.is_null() {
        let layout = Layout::from_size_align(size, 1).unwrap();
        unsafe { std::alloc::dealloc(ptr, layout) }
    }
}