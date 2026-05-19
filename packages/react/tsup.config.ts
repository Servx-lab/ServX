import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true, // Generate declaration file for TypeScript
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  minify: true, // Minify for production performance
});
