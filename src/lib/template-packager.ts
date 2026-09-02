import archiver from 'archiver';
import fs from 'fs/promises';
import path from 'path';

/**
 * Packages a demo page into a standalone, deployable Next.js project zip.
 * The customer gets a complete project they can `npm install && npm run dev`.
 */
export async function packageTemplate(demoSlug: string): Promise<Buffer> {
  // SECURITY (audit F75): demoSlug flows into path.join + zip entry names. Restrict it to a strict
  // slug charset (blocks `/`, `.`, `\`, so `../` traversal is impossible) and then double-check the
  // resolved path stays inside the demos root (defense-in-depth).
  if (!/^[a-z0-9-]+$/.test(demoSlug)) {
    throw new Error(`Invalid demo slug: ${demoSlug}`);
  }
  const root = process.cwd();
  const demosRoot = path.resolve(root, 'src', 'app', 'demos');
  const demoPath = path.join(demosRoot, demoSlug, 'demo.tsx');
  if (!path.resolve(demoPath).startsWith(demosRoot + path.sep)) {
    throw new Error(`Demo path escapes demos root: ${demoSlug}`);
  }

  // Verify demo exists
  try {
    await fs.access(demoPath);
  } catch {
    throw new Error(`Demo "${demoSlug}" not found at ${demoPath}`);
  }

  // Read demo source and shared dependencies
  const [demoSource, buttonSource, accordionSource, motionSource, utilsSource] = await Promise.all([
    fs.readFile(demoPath, 'utf-8'),
    fs.readFile(path.join(root, 'src', 'components', 'ui', 'Button.tsx'), 'utf-8'),
    fs.readFile(path.join(root, 'src', 'components', 'ui', 'Accordion.tsx'), 'utf-8'),
    fs.readFile(path.join(root, 'src', 'lib', 'motion.ts'), 'utf-8'),
    fs.readFile(path.join(root, 'src', 'lib', 'utils.ts'), 'utf-8'),
  ]);

  // Transform demo: remove @ts-nocheck, make it the page component
  const pageSource = demoSource
    .replace(/\/\/\s*@ts-nocheck\s*\n?/, '')
    .replace(/export default function \w+/, 'export default function Page');

  // Build the zip
  const chunks: Buffer[] = [];
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('data', (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
  });

  const prefix = `${demoSlug}-template`;

  // === Project scaffold files ===

  archive.append(scaffoldPackageJson(demoSlug), { name: `${prefix}/package.json` });
  archive.append(scaffoldTsConfig(), { name: `${prefix}/tsconfig.json` });
  archive.append(scaffoldNextConfig(), { name: `${prefix}/next.config.ts` });
  archive.append(scaffoldPostCssConfig(), { name: `${prefix}/postcss.config.js` });
  archive.append(scaffoldTailwindConfig(), { name: `${prefix}/tailwind.config.ts` });
  archive.append(scaffoldGlobalsCss(), { name: `${prefix}/src/app/globals.css` });
  archive.append(scaffoldLayout(demoSlug), { name: `${prefix}/src/app/layout.tsx` });
  archive.append(scaffoldReadme(demoSlug), { name: `${prefix}/README.md` });
  archive.append('', { name: `${prefix}/public/.gitkeep` });

  // === Source files ===

  // The demo page
  archive.append(pageSource, { name: `${prefix}/src/app/page.tsx` });

  // Shared components
  archive.append(buttonSource, { name: `${prefix}/src/components/ui/Button.tsx` });
  archive.append(accordionSource, { name: `${prefix}/src/components/ui/Accordion.tsx` });
  // Re-export barrel for @/components/ui imports
  archive.append(
    'export { Button } from "./Button";\nexport type { ButtonProps } from "./Button";\nexport { Accordion } from "./Accordion";\nexport type { AccordionItem, AccordionProps } from "./Accordion";\n',
    { name: `${prefix}/src/components/ui/index.ts` }
  );

  // Shared libs
  archive.append(motionSource, { name: `${prefix}/src/lib/motion.ts` });
  archive.append(utilsSource, { name: `${prefix}/src/lib/utils.ts` });

  archive.finalize();

  return done;
}

// === Scaffold file generators ===

function scaffoldPackageJson(slug: string): string {
  const name = slug.replace(/[^a-z0-9-]/g, '-');
  return JSON.stringify({
    name: `${name}-landing-page`,
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      'next': '^15.0.0',
      'react': '^19.0.0',
      'react-dom': '^19.0.0',
      'framer-motion': '^11.0.0',
      'lucide-react': '^0.400.0',
      'clsx': '^2.1.0',
      'tailwind-merge': '^2.2.0',
    },
    devDependencies: {
      '@types/node': '^22.0.0',
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      'typescript': '^5.0.0',
      'tailwindcss': '^4.0.0',
      '@tailwindcss/postcss': '^4.0.0',
    },
  }, null, 2) + '\n';
}

function scaffoldTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: {
        '@/*': ['./src/*'],
      },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  }, null, 2) + '\n';
}

function scaffoldNextConfig(): string {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`;
}

function scaffoldPostCssConfig(): string {
  return `module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
`;
}

function scaffoldTailwindConfig(): string {
  return `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`;
}

function scaffoldGlobalsCss(): string {
  return `@import "tailwindcss";

/* Custom styles */
html {
  scroll-behavior: smooth;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`;
}

function scaffoldLayout(slug: string): string {
  const title = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "${title} Landing Page",
  description: "A premium landing page template powered by Next.js, Tailwind CSS, and Framer Motion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
`;
}

function scaffoldReadme(slug: string): string {
  const title = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return `# ${title} — Landing Page Template

A premium, conversion-optimized landing page built with **Next.js**, **Tailwind CSS**, and **Framer Motion**.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see your landing page.

## Customization

### Content
Edit \`src/app/page.tsx\` to change:
- Company name, tagline, and contact info (in the constants at the top)
- Services, testimonials, FAQs (in the data arrays)
- Colors (in the \`COLORS\` object)
- Form fields and validation

### Styling
- Colors are defined in the \`COLORS\` constant in \`page.tsx\`
- Tailwind classes are used throughout — modify directly
- Animation presets are in \`src/lib/motion.ts\`

### Images
Add your images to the \`public/\` folder and reference them as \`/your-image.png\`.

## Deployment

### Vercel (Recommended)
\`\`\`bash
npx vercel
\`\`\`

### Netlify
\`\`\`bash
npm run build
# Deploy the .next folder
\`\`\`

### Static Export
Add \`output: "export"\` to \`next.config.ts\` for static HTML export.

## Tech Stack
- **Next.js 15** — React framework
- **Tailwind CSS 4** — Utility-first styling
- **Framer Motion** — Smooth animations
- **Lucide React** — Icons
- **TypeScript** — Type safety

## License
This template is licensed for use on a single project. You may modify and deploy it freely.

---
Built by [StrataLanding](https://stratalanding.com)
`;
}
