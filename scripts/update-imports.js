const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Import path mappings
const importMappings = [
  // UI Components
  { from: '@/components/ui/', to: '@/shared/components/ui/' },
  { from: '@/components/ui', to: '@/shared/components/ui' },
  
  // Utils
  { from: '@/lib/utils', to: '@/shared/utils' },
  
  // Database
  { from: '@/db/dbConfig', to: '@/infrastructure/database' },
  { from: '@/models/', to: '@/infrastructure/database/models/' },
  
  // Components
  { from: '@/components/ErrorReporter', to: '@/shared/components' },
  { from: '@/components/IframeErrorSuppressor', to: '@/shared/components' },
  { from: '@/components/OrchidsScripts', to: '@/shared/components' },
  { from: '@/components/ThemeProvider', to: '@/shared/components' },
  
  // Trading
  { from: '@/components/trading/', to: '@/domains/trading/components/' },
  { from: '@/lib/trading/', to: '@/domains/trading/services/' },
  { from: '@/hooks/use-price-stream', to: '@/domains/trading/hooks/use-price-stream' },
  { from: '@/hooks/usePriceStream', to: '@/domains/trading/hooks/usePriceStream' },
  
  // Admin
  { from: '@/components/admin/', to: '@/domains/admin/components/' },
  
  // Auth
  { from: '@/lib/auth', to: '@/domains/auth/services/auth.service' },
  
  // Hooks
  { from: '@/hooks/use-mobile', to: '@/shared/hooks/use-mobile' },
];

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    importMappings.forEach(({ from, to }) => {
      const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.includes(from)) {
        content = content.replace(regex, to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let updatedCount = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        updatedCount += processDirectory(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (updateImportsInFile(filePath)) {
        updatedCount++;
        console.log(`✓ Updated: ${filePath.replace(SRC_DIR, 'src')}`);
      }
    }
  });

  return updatedCount;
}

console.log('🔄 Updating imports to new structure...\n');
const updated = processDirectory(SRC_DIR);
console.log(`\n✅ Updated ${updated} files`);

