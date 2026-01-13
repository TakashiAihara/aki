#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createAuthCommand } from './commands/auth';
import { createInventoryCommand } from './commands/inventory';
import { createConfigCommand } from './commands/config';

const program = new Command();

program
  .name('aki')
  .description('Aki CLI - 家庭用在庫管理ツール')
  .version('1.0.0')
  .addCommand(createAuthCommand())
  .addCommand(createInventoryCommand())
  .addCommand(createConfigCommand());

// Default command - show help
program.action(() => {
  console.log(`
${chalk.bold.cyan('╔═══════════════════════════════════════════════════════════════╗')}
${chalk.bold.cyan('║')}                      ${chalk.bold('Aki CLI')}                              ${chalk.bold.cyan('║')}
${chalk.bold.cyan('║')}              ${chalk.gray('家庭用在庫管理ツール v1.0.0')}                    ${chalk.bold.cyan('║')}
${chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════╝')}

${chalk.bold('使い方:')}
  ${chalk.cyan('aki auth login')}       ログイン
  ${chalk.cyan('aki inventory list')}   在庫一覧を表示
  ${chalk.cyan('aki inventory add')}    在庫を追加
  ${chalk.cyan('aki inventory expiring')} 期限切れ間近を表示

${chalk.bold('コマンド一覧:')}
  ${chalk.cyan('auth')}       認証管理 (login, logout, status)
  ${chalk.cyan('inventory')}  在庫管理 (list, add, update, delete, expiring)
  ${chalk.cyan('config')}     CLI設定 (show, set, reset)

詳細は ${chalk.cyan('aki <command> --help')} を参照してください。
`);
});

program.parse(process.argv);
