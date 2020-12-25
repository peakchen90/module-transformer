const {execSync} = require('child_process');
const pkg = require('../package.json');

const version = pkg.version;

if (/^\d+\.\d+\.\d+$/.test(version)) {
  try {
    execSync(`git tag v${version}`, {stdio: 'ignore'});

    console.log(`push tag v${version}...`);
    execSync('git push origin master --tags');
  } catch (e) {
  }
}
