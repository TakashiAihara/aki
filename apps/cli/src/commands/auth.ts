import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import open from 'open';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '../services/config.service';
import { success, error, info } from '../utils/format';

export function createAuthCommand(): Command {
  const auth = new Command('auth').description('認証管理');

  auth
    .command('login')
    .description('ログイン（ブラウザで認証）')
    .action(async () => {
      const spinner = ora('デバイスコードを取得中...').start();

      try {
        const deviceCode = await AuthService.initiateDeviceFlow();
        spinner.stop();

        console.log('\n' + chalk.cyan('─'.repeat(50)));
        console.log(chalk.bold('\n以下のコードをブラウザで入力してください:\n'));
        console.log(chalk.bold.yellow(`    ${deviceCode.userCode}\n`));
        console.log(`認証URL: ${chalk.underline(deviceCode.verificationUri)}`);
        console.log(chalk.cyan('─'.repeat(50)) + '\n');

        info('ブラウザを開いています...');

        try {
          await open(deviceCode.verificationUriComplete || deviceCode.verificationUri);
        } catch {
          info('ブラウザを手動で開いてください');
        }

        const pollSpinner = ora('認証を待っています...').start();

        const startTime = Date.now();
        const timeout = deviceCode.expiresIn * 1000;
        const interval = deviceCode.interval * 1000;

        while (Date.now() - startTime < timeout) {
          await new Promise((resolve) => setTimeout(resolve, interval));

          try {
            const response = await AuthService.pollForToken(deviceCode.deviceCode);

            if (response.accessToken) {
              ConfigService.setAccessToken(response.accessToken);
              ConfigService.setRefreshToken(response.refreshToken);
              pollSpinner.succeed('ログインに成功しました！');
              return;
            }

            if (response.error === 'access_denied') {
              pollSpinner.fail('認証が拒否されました');
              return;
            }
          } catch (err) {
            // Continue polling on authorization_pending
            if (String(err).includes('authorization_pending')) {
              continue;
            }
            if (String(err).includes('slow_down')) {
              await new Promise((resolve) => setTimeout(resolve, interval));
              continue;
            }
            throw err;
          }
        }

        pollSpinner.fail('認証がタイムアウトしました');
      } catch (err) {
        spinner.fail('ログインに失敗しました');
        error(err instanceof Error ? err.message : String(err));
      }
    });

  auth
    .command('logout')
    .description('ログアウト')
    .action(async () => {
      const spinner = ora('ログアウト中...').start();

      try {
        await AuthService.logout();
        spinner.succeed('ログアウトしました');
      } catch (err) {
        spinner.fail('ログアウトに失敗しました');
        error(err instanceof Error ? err.message : String(err));
      }
    });

  auth
    .command('status')
    .description('認証状態を表示')
    .action(() => {
      if (ConfigService.isLoggedIn()) {
        const email = ConfigService.getUserEmail();
        success(`ログイン中${email ? ` (${email})` : ''}`);
      } else {
        info('ログインしていません');
        info('`aki auth login` でログインしてください');
      }
    });

  auth
    .command('refresh')
    .description('トークンを更新')
    .action(async () => {
      if (!ConfigService.isLoggedIn()) {
        error('ログインしていません');
        return;
      }

      const spinner = ora('トークンを更新中...').start();

      try {
        const result = await AuthService.refreshToken();
        if (result) {
          spinner.succeed('トークンを更新しました');
        } else {
          spinner.fail('トークンの更新に失敗しました');
          info('再ログインしてください: `aki auth login`');
        }
      } catch (err) {
        spinner.fail('トークンの更新に失敗しました');
        error(err instanceof Error ? err.message : String(err));
      }
    });

  return auth;
}
