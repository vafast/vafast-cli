/**
 * Vafast CLI
 * 
 * 命令：
 * - vafast sync --url <url> [--out <path>]  同步 API 类型
 */

import { cac } from 'cac'
import { syncTypes } from './commands/sync'

const cli = cac('vafast')

// sync 命令：从服务端同步类型
cli
  .command('sync', '从服务端同步 API 类型定义')
  .option('--url <url>', '服务端地址（必填）')
  .option('--out <path>', '输出文件路径', { default: 'src/api.generated.ts' })
  .option('--endpoint <path>', '契约接口路径', { default: '/__contract__' })
  .action(async (options) => {
    if (!options.url) {
      console.error('❌ 请指定服务端地址：--url <url>')
      process.exit(1)
    }
    
    await syncTypes({
      url: options.url,
      output: options.out,
      endpoint: options.endpoint,
    })
  })

// 显示帮助
cli.help()

// 显示版本
cli.version('0.1.0')

// 解析命令行参数
cli.parse()
