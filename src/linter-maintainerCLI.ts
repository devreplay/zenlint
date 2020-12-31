import * as commander from 'commander';
import { LintManager } from './lint-manager/lintManager';
import { ESLintManager } from './lint-manager/eslint/esint-js';
import { PMDManager } from './lint-manager/pmd/pmd-java8';

interface Argv {
  eslintJs?: boolean
  eslintTs?: boolean
  standard?: boolean
  pmdJava?: boolean
  evaluate?: boolean
  generate?: boolean
}

interface Option {
  short?: string
  // Commander will camelCase option names.
  name: keyof Argv | 'eslint-js' | 'eslint-ts' | 'standard' | 'pmd-java' | 'generate'
  type: 'string' | 'boolean' | 'array'
  describe: string // Short, used for usage message
  description: string // Long, used for `--help`
}

const options: Option[] = [
  {
    name: 'eslint-js',
    type: 'boolean',
    describe: 'Use ESlint for JS',
    description: 'Use ESlint for JavaScript files'
  },
  {
    name: 'eslint-ts',
    type: 'boolean',
    describe: 'Use ESLint for TS',
    description: 'Use ESLint for TypeScript files'
  },
  {
    name: 'standard',
    type: 'boolean',
    describe: 'Use standardjs',
    description: 'Use standardjs the directory files'
  },
  {
    name: 'pmd-java',
    type: 'boolean',
    describe: 'Use PMD for Java',
    description: 'Use PMD for Java files'
  },
  {
    name: 'generate',
    type: 'boolean',
    describe: 'generate a config file',
    description: 'generate a config file on the target projects'
  }
];

const cli = {
  async execute () {
    for (const option of options) {
      const commanderStr = optionUsageTag(option) + optionParam(option);
      if (option.type === 'array') {
        commander.option(commanderStr, option.describe, collect, []);
      } else {
        commander.option(commanderStr, option.describe);
      }
    }
    const parsed = commander.parseOptions(process.argv.slice(2));
    const args = parsed.operands;
    if (parsed.unknown.length !== 0) {
      (commander.parseArgs as (args: string[], unknown: string[]) => void)([], parsed.unknown);
    }
    const argv = commander.opts() as Argv;
    if (args.length < 1) {
        console.error('No target pathes specified.');
        return 2;
    }
    const targetProject = args[0];

    let lintManager: LintManager;
    if (argv.eslintJs) {
      lintManager = new ESLintManager(targetProject);
    } else if (argv.eslintTs) {
      lintManager = new ESLintManager(targetProject);
    } else if (argv.pmdJava) {
      const pmdPath = args[1];
      const configPath = args[2];
      lintManager = new PMDManager(targetProject, pmdPath, configPath);
    } else {
      lintManager = new ESLintManager(targetProject);
    }

    if (argv.generate) {
      void lintManager.outputConfigFile();
    } else {
      const ruleMap = await lintManager.makeRuleMap();
      if (ruleMap === undefined) {
        return 1;
      }
      const hiddenRules = ruleMap.getFalseNegative();
      const unwantedRules = ruleMap.getFalsePositive();
      console.log(ruleMap.makeAddRemovedSummary());
      const results_length = hiddenRules.length + unwantedRules.length;
      return results_length === 0 ? 0 : 1;
    }
    return 0;
  }
};

function collect (val: string, memory: string[]): string[] {
  memory.push(val);

  return memory;
}

function optionUsageTag ({ short, name }: Option): string {
  return short !== undefined ? `-${short}, --${name}` : `--${name}`;
}

function optionParam (option: Option): string {
  switch (option.type) {
    case 'string':
      return ` [${option.name}]`;
    case 'array':
      return ` <${option.name}>`;
    case 'boolean':
      return '';
    default:
      return '';
  }
}

module.exports = cli;
