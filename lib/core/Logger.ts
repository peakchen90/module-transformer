/**
 * 日志管理
 */
import chalk from 'chalk';

export default class Logger {
  name: string

  constructor(name: string) {
    this.name = chalk.bold(`[${name}]`);
  }

  info(message: any) {
    console.log(chalk.cyan(`${this.name} ${message}`));
  }

  success(message: any) {
    console.log(chalk.green(`${this.name} ${message}`));
  }

  error(message: any) {
    if (message instanceof Error) {
      message = message.stack;
    }
    console.log(chalk.red(`${this.name} ${message}`));
  }

  warn(message: any) {
    console.warn(chalk.rgb(220, 142, 0)(`${this.name} ${message}`));
  }
}
