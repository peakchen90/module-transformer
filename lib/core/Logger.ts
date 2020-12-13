import chalk from 'chalk';

/**
 * 日志管理
 */
export default class Logger {
  name: string

  constructor(name: string) {
    this.name = chalk.bold(`[${name}]`);
  }

  /**
   * 打印信息日志
   * @param message
   */
  info(message: any) {
    console.log(chalk.cyan(`${this.name} ${message}`));
  }

  /**
   * 打印成功日志
   * @param message
   */
  success(message: any) {
    console.log(chalk.green(`${this.name} ${message}`));
  }

  /**
   * 打印错误日志
   * @param message
   */
  error(message: any) {
    if (message instanceof Error) {
      message = message.stack;
    }
    console.log(chalk.red(`${this.name} ${message}`));
  }

  /**
   * 打印警告日志
   * @param message
   */
  warn(message: any) {
    console.warn(chalk.rgb(220, 142, 0)(`${this.name} ${message}`));
  }
}
