import { Tcp } from './protocol/tcp';

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

  const tcp = new Tcp(hostname, port, {
    onData: async (data) => {
      console.log(data.toString());
      await tcp.end();
      console.log('END');
    },
    onError: (error) => console.log('error', error),
  });

  await tcp.connect();
  const resp = await tcp.write(`GET / HTTP/1.1\nHost:${hostname}\n\n`);
  console.log(resp);
})();
