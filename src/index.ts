// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Tcp } from './protocol/tcp';
import { Request } from './protocol/http1-1';

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  if (process.argv.length <= 2) {
    console.error('argument required');
    process.exit(1);
  }
  const url = process.argv[2];
  const match = /^([a-z.]+):(\d+)$/.exec(url);
  if (!match) {
    console.error('argument parse error');
    process.exit(1);
  }
  const hostname = match[1];
  const port = Number.parseInt(match[2], 10);

  const request = new Request(hostname, port, {});
  const resp = await request.execute();
  console.log(resp.getStatusCode());
  console.log(resp.getStatusText());
  console.log(resp.getHeaders());
})();
