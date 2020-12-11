/**
 * 日志管理
 */
import chalk from 'chalk';

const Logger = {
  info(message: string) {
    console.log(message);
  },
  error(message: string) {
    console.log(chalk.red(message));
  },
  warn(message: string) {
    console.warn(chalk.rgb(234, 158, 18)(message));
  }
};

export default Logger;
