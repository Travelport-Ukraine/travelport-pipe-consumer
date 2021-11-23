const http = require('http');
const zlib = require('zlib');
const cluster = require('cluster');
const { promisify } = require('util');
const numCPUs = require('os').cpus().length;

const DEFAULT_PORT = 80;
const { log } = console;
const brotliDecompress = promisify(zlib.brotliDecompress);

async function process(data) {
  const { body, headers } = data;
  log(`Processing data. Headers: ${JSON.stringify(headers)}`);
  log(`Compressed body length: ${body.length}`);

  try {
    const decompressedBody = await brotliDecompress(body);
    log(`Decompressed body length: ${decompressedBody.length}`);
  } catch (err) {
    log('Decompression failed');
  }
}

function handle(req, res) {
  const { host, ...headers } = req.headers;
  const market = headers['x-point-of-sale'];
  const version = headers['x-csv-version-number'];
  const pcc = headers['x-customer-pcc'];

  log(`Request received: ${JSON.stringify({
    host, market, version, pcc,
  })}`);

  const chunks = [];

  // Collect chunks
  req.on('data', (chunk) => chunks.push(chunk));

  // Send response on end BEFORE processing starts
  req.on('end', () => {
    // Providing response
    res.setHeader('Content-Length', 0);
    res.setHeader('transfer-encoding', '');
    res.writeHead(200);
    res.end();

    // Starting processing
    const body = Buffer.concat(chunks);
    process({ body, headers });
  });
}

if (cluster.isPrimary) {
  // Starting cluster
  log(`Stream consumer started with ${numCPUs} cpus`);

  // Fork workers
  Array.from(Array(numCPUs)).forEach(() => {
    cluster.fork();
  });

  cluster.on('exit', (worker) => {
    log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Processing data here

  const server = http.createServer((req, res) => {
    req.on('error', (err) => {
      log('Request err', err);
      res.end(err);
    });

    res.on('error', (err) => {
      log('Response error', err);
    });

    switch (req.url) {
      case '/':
        if (req.method === 'POST') {
          handle(req, res);
        } else {
          res.writeHead(405, 'Method Not Allowed');
          res.end();
        }
        break;
      default:
        res.writeHead(404, 'Not Found');
        res.end();
    }
  });

  server.on('error', (err) => {
    log('Server error', err);
  });

  server.listen(DEFAULT_PORT);
}
