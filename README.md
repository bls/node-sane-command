# @sane/command

Promisified api for shell commands and simple daemons.

Install
-------

```bash
npm install @sane/command --save
```

Example
-------

```javascript
import { cmd, Daemon } from '@sane/service';

async function main() {
  let repoUrl = 'https://github.com/bls/node-sane-command.git'
  await cmd(['git', 'clone', repoUrl]);
  let gitd = new Daemon(['git', 'daemon', '/tmp']);
  await gitd.start();
  //
  // Code requiring local git daemon goes here...
  // 
  await gitd.stop();
}

main()
```

Compatibility
-------------

* Requires Node >= v4.0.0

Release
-------

1. Bump up the version number in package.json
1. Add a section for the new release in CHANGELOG.md
1. Run prepublish and test npm scripts
1. Commit
1. Create a git tag for the new release and push it
1. Run npm publish

