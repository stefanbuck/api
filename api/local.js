const http = require('http');
const got = require('got');
const handler = require('./handler.js');

const zeitId = process.argv[2];

if (!zeitId) {
  http
    .createServer((req, res) => {
      if (!req.url.includes('favicon.ico')) {
        handler(req, res);
      }
    })
    .listen(3000);
}

const url = zeitId
  ? `https://octolinker-${zeitId}.now.sh/`
  : 'http://localhost:3000/';
console.log(url);

const timings = [];
const initialRequest = () => {
  console.log('---------------------');
  got
    .post({
      json: true,
      url,
      body: [
        // { type: "bower", target: "jquery" },
        // {"type": "composer", "target": "phpunit/phpunit"},
        // {"type": "rubygems", "target": "nokogiri"},
        { type: 'foo', target: 'bar' },
        { type: 'npm', target: '' },
        { type: 'npm', target: 'request' },
        { type: 'npm', target: 'request' },
        { type: 'npm', target: 'babel-helper-regex' },
        // {"type": "npm", "target": "audio-context-polyfill"},
        // {"type": "npm", "target": "github-url-from-username-repo"},
        // {"type": "npm", "target": "find-project-root"},
        // {"type": "pypi", "target": "simplejson"},
        // {"type": "crates", "target": "libc"},
        { type: 'go', target: 'k8s.io/kubernetes/pkg/api' },

        // { type: "melpa", target: "zzz-to-char" }, // only supported in API

        { type: 'java', target: 'org.apache.log4j.Appender' },
        { type: 'ping', target: 'https://nodejs.org/api/path.html' },
        { type: 'ping', target: 'http://notfound4040.org/path.html' },
        { type: 'unkown', target: 'boom' },
        {},
        { foo: 'bar' },
        1,
        undefined,
        'foo',
      ],
    })
    .then(({ body }) => {
      timings.push(body);

      if (timings.length < 1) {
        initialRequest();
      } else {
        console.log('---------------------');
        console.log(JSON.stringify(timings, null, ' '));
      }
    })
    .catch((error) => {
      console.log(error);
    });
};
initialRequest();
