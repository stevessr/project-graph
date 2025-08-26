import originalClassName from "@graphif/unplugin-original-class-name/rollup";
import { defineConfig } from "tsdown";

export default defineConfig({
  plugins: [originalClassName()],
});
