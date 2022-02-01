/* eslint-disable */
import { Tls1_2 } from './protocol/tls1-2';

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  if (process.argv.length <= 2) {
    console.error('argument required');
    process.exit(1); // eslint-disable-line
  }
  const url = process.argv[2];
  const match = /^([a-z.]+):(\d+)$/.exec(url);
  if (!match) {
    console.error('argument parse error');
    process.exit(1); // eslint-disable-line
  }
  const hostname = match[1];
  const port = Number.parseInt(match[2], 10);

  const tls = new Tls1_2(hostname, port, {});
  await tls.connect();
  setTimeout(() => console.log(1000), 10000);
})();
