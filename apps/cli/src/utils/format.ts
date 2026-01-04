import chalk from 'chalk';
import Table from 'cli-table3';
import { InventoryItemDTO, ExpirationStatus, getExpirationStatus } from '@akimi/shared';

export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatExpirationStatus(item: InventoryItemDTO): string {
  const status = getExpirationStatus(item.expirationDate);

  switch (status) {
    case ExpirationStatus.EXPIRED:
      return chalk.red('期限切れ');
    case ExpirationStatus.EXPIRING_SOON:
      return chalk.yellow('まもなく期限');
    case ExpirationStatus.FRESH:
      return chalk.green('新鮮');
    case ExpirationStatus.NONE:
      return chalk.gray('-');
    default:
      return '-';
  }
}

export function formatInventoryTable(items: InventoryItemDTO[]): string {
  const table = new Table({
    head: [
      chalk.cyan('名前'),
      chalk.cyan('数量'),
      chalk.cyan('カテゴリ'),
      chalk.cyan('保管場所'),
      chalk.cyan('期限'),
      chalk.cyan('状態'),
    ],
    colWidths: [20, 10, 12, 12, 12, 12],
    wordWrap: true,
  });

  for (const item of items) {
    const categoryName = typeof item.category === 'object'
      ? item.category.name
      : String(item.category || '-');
    const locationName = item.storageLocation
      ? (typeof item.storageLocation === 'object' ? item.storageLocation.name : String(item.storageLocation))
      : '-';

    table.push([
      item.name,
      `${item.quantity} ${item.unit}`,
      categoryName,
      locationName,
      formatDate(item.expirationDate),
      formatExpirationStatus(item),
    ]);
  }

  return table.toString();
}

export function formatItemDetail(item: InventoryItemDTO): string {
  const lines = [
    '',
    chalk.bold.cyan('在庫アイテム詳細'),
    chalk.gray('─'.repeat(40)),
    `${chalk.bold('ID:')}           ${item.id}`,
    `${chalk.bold('名前:')}         ${item.name}`,
    `${chalk.bold('数量:')}         ${item.quantity} ${item.unit}`,
    `${chalk.bold('カテゴリ:')}     ${typeof item.category === 'object' ? item.category.name : item.category}`,
    `${chalk.bold('保管場所:')}     ${item.storageLocation ? (typeof item.storageLocation === 'object' ? item.storageLocation.name : item.storageLocation) : '-'}`,
    `${chalk.bold('期限:')}         ${formatDate(item.expirationDate)}`,
    `${chalk.bold('状態:')}         ${formatExpirationStatus(item)}`,
    `${chalk.bold('メモ:')}         ${item.notes || '-'}`,
    chalk.gray('─'.repeat(40)),
    `${chalk.gray('作成日時:')} ${new Date(item.createdAt).toLocaleString('ja-JP')}`,
    `${chalk.gray('更新日時:')} ${new Date(item.updatedAt).toLocaleString('ja-JP')}`,
    '',
  ];

  return lines.join('\n');
}

export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

export function warning(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}
