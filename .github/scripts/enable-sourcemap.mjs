import { readFileSync, writeFileSync } from "fs";

const VITE_CONFIG_PATH = "app/vite.config.ts";

const conf = readFileSync(VITE_CONFIG_PATH);
const updated = conf.toString().replace("sourcemap: false", "sourcemap: true");

writeFileSync(VITE_CONFIG_PATH, updated);

console.log(updated);
