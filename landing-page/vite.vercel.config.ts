import vinext from "vinext";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

export default defineConfig({
  plugins: [vinext(), sites(), nitro()],
});
