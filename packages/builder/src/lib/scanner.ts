import fs from 'fs/promises';
import path from 'path';

export interface ScanFinding {
  file: string;
  line: number;
  rule: string;
  severity: 'critical' | 'warning';
  message: string;
}

export interface ScanResult {
  passed: boolean;
  findings: ScanFinding[];
}

interface ScanRule {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'warning';
  message: string;
}

const SCAN_RULES: ScanRule[] = [
  {
    name: 'eval-usage',
    pattern: /\beval\s*\(/,
    severity: 'critical',
    message: 'Use of eval() is not allowed',
  },
  {
    name: 'new-function',
    pattern: /new\s+Function\s*\(/,
    severity: 'critical',
    message: 'Use of new Function() is not allowed',
  },
  {
    name: 'child-process',
    pattern: /require\s*\(\s*['"]child_process['"]\s*\)/,
    severity: 'critical',
    message: 'Use of child_process module is not allowed',
  },
  {
    name: 'child-process-import',
    pattern: /import\s+.*from\s+['"]child_process['"]/,
    severity: 'critical',
    message: 'Import of child_process module is not allowed',
  },
  {
    name: 'fs-module',
    pattern: /require\s*\(\s*['"](?:fs|node:fs)['"]\s*\)/,
    severity: 'warning',
    message: 'Use of fs module detected — review for safety',
  },
  {
    name: 'net-module',
    pattern: /require\s*\(\s*['"](?:net|http|https|node:net|node:http|node:https)['"]\s*\)/,
    severity: 'critical',
    message: 'Use of network modules is not allowed',
  },
  {
    name: 'net-module-import',
    pattern: /import\s+.*from\s+['"](?:net|http|https|node:net|node:http|node:https)['"]/,
    severity: 'critical',
    message: 'Import of network modules is not allowed',
  },
  {
    name: 'process-env',
    pattern: /process\.env/,
    severity: 'warning',
    message: 'Access to process.env detected — review for safety',
  },
  {
    name: 'dynamic-import-url',
    pattern: /import\s*\(\s*['"`]https?:/,
    severity: 'critical',
    message: 'Dynamic imports from URLs are not allowed',
  },
];

const SCANNABLE_EXTENSIONS = new Set(['.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx']);

async function getFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      files.push(...(await getFiles(fullPath)));
    } else if (SCANNABLE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function scanDirectory(dirPath: string): Promise<ScanResult> {
  const findings: ScanFinding[] = [];
  const files = await getFiles(dirPath);

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(dirPath, filePath);

    for (let i = 0; i < lines.length; i++) {
      for (const rule of SCAN_RULES) {
        if (rule.pattern.test(lines[i])) {
          findings.push({
            file: relativePath,
            line: i + 1,
            rule: rule.name,
            severity: rule.severity,
            message: rule.message,
          });
        }
      }
    }
  }

  const hasCritical = findings.some((f) => f.severity === 'critical');
  return { passed: !hasCritical, findings };
}
