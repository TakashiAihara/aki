import { Command } from 'commander';
import { ConfigService } from '../services/config.service';
import { apiService } from '../services/api.service';
import { success, error, info } from '../utils/format';
import chalk from 'chalk';

export function createConfigCommand(): Command {
  const config = new Command('config').description('CLI設定');

  config
    .command('show')
    .description('現在の設定を表示')
    .action(() => {
      const settings = ConfigService.getAll();

      console.log('\n' + chalk.bold.cyan('Aki CLI 設定'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(`${chalk.bold('API URL:')}     ${settings.apiUrl || 'http://localhost:3002'}`);
      console.log(`${chalk.bold('ログイン:')}   ${settings.accessToken ? chalk.green('✓ ログイン中') : chalk.gray('未ログイン')}`);
      if (settings.userEmail) {
        console.log(`${chalk.bold('メール:')}     ${settings.userEmail}`);
      }
      console.log(chalk.gray('─'.repeat(40)) + '\n');
    });

  config
    .command('set <key> <value>')
    .description('設定値を変更')
    .action((key: string, value: string) => {
      switch (key) {
        case 'api-url':
        case 'apiUrl':
          ConfigService.setApiUrl(value);
          apiService.updateBaseUrl();
          success(`API URLを ${value} に設定しました`);
          break;
        default:
          error(`不明な設定キー: ${key}`);
          info('利用可能なキー: api-url');
      }
    });

  config
    .command('reset')
    .description('設定をリセット')
    .action(() => {
      ConfigService.clearAuth();
      success('設定をリセットしました');
    });

  return config;
}
