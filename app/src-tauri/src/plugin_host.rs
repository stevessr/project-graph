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

impl serde::Serialize for Plugin {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("Plugin", 6)?;
        state.serialize_field("id", &self.id)?;
        state.serialize_field("name", &self.name)?;
        state.serialize_field("version", &self.version)?;
        state.serialize_field("description", &self.description)?;
        state.serialize_field("author", &self.author)?;
        state.serialize_field("entry_point", &self.entry_point.to_str().unwrap())?;
        state.end()
    }
}
