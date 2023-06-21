import minimist from 'minimist';

import { copyModule } from './index';

interface Argv {
  from: string;
  'from-token'?: string;
  'from-username'?: string;
  'from-password'?: string;
  to: string;
  'to-token'?: string;
  'to-username'?: string;
  'to-password'?: string;
  _: string[];
  verbose?: boolean;
  force?: boolean;
  limit?: number;
}

function usage() {
  console.log('usage: npm-copy --from <repository url> --from-token <token> --to <repository url> --to-token <token> moduleA [moduleB...]');
}

export async function cli(argvSliced: string[]) {
  const argv = minimist<Argv>(argvSliced, {
    boolean: ['verbose', 'force'],
  });
  const from = {
    url: argv.from,
    token: argv['from-token'],
    username: argv['from-username'],
    password: argv['from-password'],
  };
  const to = {
    url: argv.to,
    token: argv['to-token'],
    username: argv['to-username'],
    password: argv['to-password'],
  };

  if (!from.url || !to.url) {
    usage();
    process.exit(0);
  }
  const opts = {
    verbose: argv.verbose || false,
    limit: argv.limit,
    force: argv.force,
  };

  // Run in series so the logs are more intelligible
  await argv._.reduce(
    async (prev, module) => prev.then(() => copyModule({ ...opts, from, to, module })), Promise.resolve());
}
