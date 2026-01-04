import { Command } from 'commander';
import ora from 'ora';
import inquirer from 'inquirer';
import { apiService } from '../services/api.service';
import { ConfigService } from '../services/config.service';
import {
  formatInventoryTable,
  formatItemDetail,
  success,
  error,
  warning,
  info,
} from '../utils/format';
import { CategoryDTO, StorageLocationDTO } from '@aki/shared';

function requireAuth(): boolean {
  if (!ConfigService.isLoggedIn()) {
    error('ログインが必要です');
    info('`aki auth login` でログインしてください');
    return false;
  }
  return true;
}

export function createInventoryCommand(): Command {
  const inventory = new Command('inventory')
    .alias('inv')
    .description('在庫管理');

  // List inventory
  inventory
    .command('list')
    .alias('ls')
    .description('在庫一覧を表示')
    .option('-s, --search <query>', '名前で検索')
    .option('-c, --category <id>', 'カテゴリでフィルタ')
    .option('-l, --location <id>', '保管場所でフィルタ')
    .option('-d, --depleted', '使い切った在庫も表示')
    .option('-e, --expiring <days>', '期限が近いもののみ表示', parseInt)
    .option('-n, --limit <count>', '表示件数', parseInt)
    .action(async (options) => {
      if (!requireAuth()) return;

      const spinner = ora('在庫を取得中...').start();

      try {
        const result = await apiService.listInventory({
          search: options.search,
          categoryId: options.category,
          storageLocationId: options.location,
          includeDepleted: options.depleted,
          expiringWithinDays: options.expiring,
          limit: options.limit || 50,
        });

        spinner.stop();

        if (result.items.length === 0) {
          info('在庫がありません');
          return;
        }

        console.log(formatInventoryTable(result.items));

        if (result.pagination.hasMore) {
          info(`さらに${result.pagination.total ? result.pagination.total - result.items.length : ''}件あります`);
        }
      } catch (err) {
        spinner.fail('在庫の取得に失敗しました');
        error(err instanceof Error ? err.message : String(err));
      }
    });

  // Show item detail
  inventory
    .command('show <id>')
    .description('在庫アイテムの詳細を表示')
    .action(async (id: string) => {
      if (!requireAuth()) return;

      const spinner = ora('アイテムを取得中...').start();

      try {
        const item = await apiService.getInventoryItem(id);
        spinner.stop();
        console.log(formatItemDetail(item));
      } catch (err) {
        spinner.fail('アイテムの取得に失敗しました');
        error(err instanceof Error ? err.message : String(err));
      }
    });

  // Add item
  inventory
    .command('add')
    .description('在庫を追加')
    .option('-n, --name <name>', '名前')
    .option('-q, --quantity <number>', '数量', parseFloat)
    .option('-u, --unit <unit>', '単位')
    .option('-c, --category <id>', 'カテゴリID')
    .option('-l, --location <id>', '保管場所ID')
    .option('-e, --expiration <date>', '期限日 (YYYY-MM-DD)')
    .option('--notes <notes>', 'メモ')
    .option('-i, --interactive', '対話モード')
    .action(async (options) => {
      if (!requireAuth()) return;

      let data = {
        name: options.name,
        quantity: options.quantity,
        unit: options.unit,
        categoryId: options.category,
        storageLocationId: options.location,
        expirationDate: options.expiration,
        notes: options.notes,
      };

      if (options.interactive || !data.name) {
        data = await promptForItemData(data);
      }

      if (!data.name || !data.quantity || !data.unit || !data.categoryId) {
        error('必須項目が入力されていません');
        return;
      }

      const spinner = ora('在庫を追加中...').start();

      try {
        const item = await apiService.createInventoryItem({
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          categoryId: data.categoryId,
          storageLocationId: data.storageLocationId || undefined,
          expirationDate: data.expirationDate || undefined,
          notes: data.notes || undefined,
        });
        spinner.succeed(`「${item.name}」を追加しました`);
      } catch (err) {
        spinner.fail('在庫の追加に失敗しました');
        error(err instanceof Error ? err.message : String(err));
      }
    });

  // Update item
  inventory
    .command('update <id>')
    .description('在庫を更新')
    .option('-n, --name <name>', '名前')
    .option('-q, --quantity <number>', '数量', parseFloat)
    .option('-u, --unit <unit>', '単位')
    .option('-c, --category <id>', 'カテゴリID')
    .option('-l, --location <id>', '保管場所ID')
    .option('-e, --expiration <date>', '期限日 (YYYY-MM-DD)')
    .option('--notes <notes>', 'メモ')
    .action(async (id: string, options) => {
      if (!requireAuth()) return;

      const updateData: Record<string, unknown> = {};
      if (options.name) updateData.name = options.name;
      if (options.quantity !== undefined) updateData.quantity = options.quantity;
      if (options.unit) updateData.unit = options.unit;
      if (options.category) updateData.categoryId = options.category;
      if (options.location) updateData.storageLocationId = options.location;
      if (options.expiration) updateData.expirationDate = options.expiration;
      if (options.notes !== undefined) updateData.notes = options.notes;

      if (Object.keys(updateData).length === 0) {
        error('更新する項目を指定してください');
        return;
      }

      const spinner = ora('在庫を更新中...').start();

      try {
        const item = await apiService.updateInventoryItem(id, updateData);
        spinner.succeed(`「${item.name}」を更新しました`);
      } catch (err) {
        spinner.fail('在庫の更新に失敗しました');
        error(err instanceof Error ? err.message : String(err));
      }
    });

  // Delete item
  inventory
    .command('delete <id>')
    .alias('rm')
    .description('在庫を削除')
    .option('-f, --force', '確認なしで削除')
    .action(async (id: string, options) => {
      if (!requireAuth()) return;

      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: '本当に削除しますか？',
            default: false,
          },
        ]);

        if (!confirm) {
          info('削除をキャンセルしました');
          return;
        }
      }

      const spinner = ora('在庫を削除中...').start();

      try {
        await apiService.deleteInventoryItem(id);
        spinner.succeed('在庫を削除しました');
      } catch (err) {
        spinner.fail('在庫の削除に失敗しました');
        error(err instanceof Error ? err.message : String(err));
      }
    });

  // Expiring items
  inventory
    .command('expiring')
    .description('期限が近い在庫を表示')
    .option('-d, --days <days>', '日数', parseInt, 3)
    .action(async (options) => {
      if (!requireAuth()) return;

      const spinner = ora('期限切れ間近の在庫を取得中...').start();

      try {
        const items = await apiService.getExpiringItems(options.days);
        spinner.stop();

        if (items.length === 0) {
          success(`${options.days}日以内に期限が切れる在庫はありません`);
          return;
        }

        warning(`${options.days}日以内に期限が切れる在庫: ${items.length}件`);
        console.log(formatInventoryTable(items));
      } catch (err) {
        spinner.fail('在庫の取得に失敗しました');
        error(err instanceof Error ? err.message : String(err));
      }
    });

  return inventory;
}

async function promptForItemData(initial: Record<string, unknown> = {}): Promise<{
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  storageLocationId?: string;
  expirationDate?: string;
  notes?: string;
}> {
  let categories: CategoryDTO[] = [];
  let locations: StorageLocationDTO[] = [];

  try {
    [categories, locations] = await Promise.all([
      apiService.getCategories(),
      apiService.getStorageLocations(),
    ]);
  } catch {
    error('カテゴリと保管場所の取得に失敗しました');
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '名前:',
      default: initial.name,
      validate: (input) => input.length > 0 || '名前を入力してください',
    },
    {
      type: 'number',
      name: 'quantity',
      message: '数量:',
      default: initial.quantity || 1,
      validate: (input) => input > 0 || '1以上の数を入力してください',
    },
    {
      type: 'input',
      name: 'unit',
      message: '単位 (個, kg, Lなど):',
      default: initial.unit || '個',
    },
    {
      type: 'list',
      name: 'categoryId',
      message: 'カテゴリ:',
      choices: categories.map((c) => ({ name: `${c.icon || ''} ${c.name}`, value: c.id })),
      default: initial.categoryId,
    },
    {
      type: 'list',
      name: 'storageLocationId',
      message: '保管場所:',
      choices: [
        { name: '(なし)', value: undefined },
        ...locations.map((l) => ({ name: l.name, value: l.id })),
      ],
      default: initial.storageLocationId,
    },
    {
      type: 'input',
      name: 'expirationDate',
      message: '期限日 (YYYY-MM-DD, 空欄でスキップ):',
      default: initial.expirationDate,
      validate: (input) => {
        if (!input) return true;
        return /^\d{4}-\d{2}-\d{2}$/.test(input) || 'YYYY-MM-DD形式で入力してください';
      },
    },
    {
      type: 'input',
      name: 'notes',
      message: 'メモ (オプション):',
      default: initial.notes,
    },
  ]);

  return answers;
}
