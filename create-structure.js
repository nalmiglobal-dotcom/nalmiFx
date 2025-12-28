const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');

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

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✓ Created: ${dirPath.replace(__dirname, '')}`);
  }
}

function createStructure(basePath, structure) {
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

console.log('🚀 Creating professional FAANG-level folder structure...\n');
createStructure(SRC_DIR, NEW_STRUCTURE);
console.log('\n✅ Folder structure created successfully!');

