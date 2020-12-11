/**
 * 日志管理
 */
const Logger = {
  info(message: string) {
    console.log(message);
  },
  error(message: string) {
    console.error(message);
  },
  warn(message: string) {
    console.warn(message);
  }
};

export default Logger;
