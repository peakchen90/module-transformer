/**
 * 日志管理
 */
import chalk from 'chalk';

const Logger = {
  info(message: string) {
    console.log(chalk.cyan(`[info] ${message}`));
  },
  success(message: string) {
    console.log(chalk.green(`[success] ${message}`));
  },
  error(message: string) {
    console.log(chalk.red(`[error] ${message}`));
  },
  warn(message: string) {
    console.warn(chalk.rgb(220, 142, 0)(`[warn] ${message}`));
  }
};

export default Logger;
