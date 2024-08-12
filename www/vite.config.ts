import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { threeMinifier } from "@yushijinhun/three-minifier-rollup";
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
	plugins: [
		sveltekit(),
		wasm(),
    	topLevelAwait(),
    	mkcert(),
    	{ ...threeMinifier(), enforce: "pre" },
	],
	ssr: {
		noExternal: ['three']
	}
});
