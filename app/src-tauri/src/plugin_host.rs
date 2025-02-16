use std::path::PathBuf;

use tauri::{AppHandle, Manager};

pub struct PluginHost {
    initialized: bool,
}

impl PluginHost {
    pub fn new() -> Self {
        Self { initialized: false }
    }

    pub fn init(&mut self) {
        if self.initialized {
            return;
        }
        let platform = v8::new_default_platform(0, true).make_shared();
        v8::V8::initialize_platform(platform);
        v8::V8::initialize();
        self.initialized = true;
    }

    fn get_plugins(&self, app_handle: AppHandle) -> Result<PathBuf, String> {
        match app_handle.path().app_data_dir() {
            Ok(path) => Ok(path.join("plugins")),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn run_entry_point(&self) {
        // Create a new Isolate and make it the current one.
        let isolate = &mut v8::Isolate::new(v8::CreateParams::default());

        // Create a stack-allocated handle scope.
        let handle_scope = &mut v8::HandleScope::new(isolate);

        // Create a new context.
        let context = v8::Context::new(handle_scope, Default::default());

        // Enter the context for compiling and running the hello world script.
        let scope = &mut v8::ContextScope::new(handle_scope, context);

        // Create a string containing the JavaScript source code.
        let code = v8::String::new(scope, "'Hello' + ' World!'").unwrap();

        // Compile the source code.
        let script = v8::Script::compile(scope, code, None).unwrap();

        // Run the script to get the result.
        let result = script.run(scope).unwrap();

        // Convert the result to a string and print it.
        let result = result.to_string(scope).unwrap();
        println!("{}", result.to_rust_string_lossy(scope));
    }
}
