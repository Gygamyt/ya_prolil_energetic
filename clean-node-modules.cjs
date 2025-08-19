const fs = require('fs');
const path = require('path');

function findAndDeleteNodeModules(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            const fullPath = path.join(dir, item.name);

            if (item.name === 'node_modules') {
                console.log(`🗑️  Deleting: ${fullPath}`);
                fs.rmSync(fullPath, { recursive: true, force: true });
            } else {
                try {
                    findAndDeleteNodeModules(fullPath);
                } catch (error) {
                }
            }
        }
    }
}

console.log('🔍 Searching for node_modules directories...');
try {
    findAndDeleteNodeModules(process.cwd());
    console.log('✅ All node_modules directories have been deleted!');
} catch (error) {
    console.error('❌ Error:', error.message);
}