#!/usr/bin/env tsx
/**
 * Professional Folder Structure Migration Script
 * 
 * This script creates the new FAANG-level folder structure
 * Run: tsx scripts/restructure.ts
 */

import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');
const NEW_STRUCTURE = {
  'domains': {
    'auth': ['components', 'services', 'repositories', 'types', 'validators', 'hooks'],
    'trading': ['components', 'services', 'repositories', 'types', 'validators', 'hooks'],
    'admin': ['components', 'services', 'repositories', 'types', 'validators', 'hooks'],
    'user': ['components', 'services', 'repositories', 'types', 'validators', 'hooks'],
    'wallet': ['components', 'services', 'repositories', 'types', 'validators', 'hooks'],
    'challenge': ['components', 'services', 'repositories', 'types', 'validators', 'hooks'],
    'ib': ['components', 'services', 'repositories', 'types', 'validators', 'hooks'],
    'competition': ['components', 'services', 'repositories', 'types', 'validators', 'hooks'],
  },
  'shared': {
    'components': ['ui'],
    'hooks': [],
    'utils': [],
    'constants': [],
    'types': [],
    'lib': ['errors', 'validation'],
  },
  'infrastructure': {
    'database': ['models', 'migrations'],
    'cache': [],
    'queue': [],
    'external': ['metaapi', 'finnhub', 'tradingview'],
    'storage': [],
  },
  'core': {
    'services': [],
    'repositories': [],
    'entities': [],
    'use-cases': [],
  },
  'config': [],
  'types': ['api', 'database', 'common'],
  'middleware': [],
  '__tests__': ['unit', 'integration', 'e2e'],
};

function createDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✓ Created: ${dirPath}`);
  }
}

function createStructure(basePath: string, structure: any) {
  for (const [key, value] of Object.entries(structure)) {
    const dirPath = path.join(basePath, key);
    createDirectory(dirPath);
    
    if (Array.isArray(value)) {
      value.forEach(subDir => {
        createDirectory(path.join(dirPath, subDir));
      });
    } else if (typeof value === 'object') {
      createStructure(dirPath, value);
    }
  }
}

function createIndexFiles() {
  const indexFiles = [
    { path: 'src/shared/lib/errors/index.ts', content: '// Error handling exports\n' },
    { path: 'src/shared/lib/validation/index.ts', '// Validation exports\n' },
    { path: 'src/config/index.ts', content: '// Configuration exports\n' },
    { path: 'src/types/common/index.ts', content: '// Common types\n' },
  ];

  indexFiles.forEach(({ path: filePath, content }) => {
    const fullPath = path.join(process.cwd(), filePath);
    const dir = path.dirname(fullPath);
    createDirectory(dir);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content);
      console.log(`✓ Created: ${filePath}`);
    }
  });
}

console.log('🚀 Creating professional FAANG-level folder structure...\n');
createStructure(SRC_DIR, NEW_STRUCTURE);
createIndexFiles();
console.log('\n✅ Folder structure created successfully!');
console.log('\n📝 Next steps:');
console.log('1. Review the new structure');
console.log('2. Move files to appropriate domains');
console.log('3. Extract services from API routes');
console.log('4. Update imports');

