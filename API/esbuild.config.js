import esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';

const baseConfig = {
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: 'dist',
  sourcemap: true,
  plugins: [nodeExternalsPlugin()],
  logLevel: 'info',
};

// Development build configuration
const devConfig = {
  ...baseConfig,
  define: {
    'process.env.NODE_ENV': '"development"',
  },
  minify: false,
  sourcemap: true,

  alias: {
    '@': './src',
  },
};

// Production build configuration
const prodConfig = {
  ...baseConfig,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  minify: true,
  sourcemap: true,
  drop: ['debugger'],
  splitting: true,
  format: 'esm',
  outExtension: { '.js': '.mjs' },
  metafile: true,

  alias: {
    '@': './src',
  },
};

// Build script
const build = async (isProd = false) => {
  try {
    const config = isProd ? prodConfig : devConfig;

    console.log('Build started.....');
    await esbuild.build({
      ...config,
      outdir: 'dist',
    });

    console.log('Build completed.....');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
};

// Handle command line arguments
const isProd = process.argv.includes('--prod');
build(isProd);
