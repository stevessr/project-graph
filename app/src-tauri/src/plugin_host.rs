use std::path::Path;

pub struct PluginHost {
    v8_platform: v8::SharedRef<v8::Platform>,
}

impl PluginHost {
    pub fn new() -> Self {
        Self {
            v8_platform: v8::new_default_platform(0, true).make_shared(),
        }
    }

    pub fn init(&self) {}

    fn get_plugins(&self) {
        todo!();
    }
}

struct Plugin {
    id: String,
    name: String,
    version: String,
    description: String,
    author: String,
    entry_point: Path,
}
