# pleak-frontend

The user-facing part of the Privacy Leak Tools

v0.0.4

## Prerequisites

You need to locate [pleak-backend](https://github.com/pleak-tools/pleak-backend), pleak-frontend, [pleak-sql-analysis](https://github.com/pleak-tools/pleak-sql-analysis), [pleak-sql-editor](https://github.com/pleak-tools/pleak-sql-editor), [pleak-pe-bpmn-editor](https://github.com/pleak-tools/pleak-pe-bpmn-editor) and [pleak-sql-derivative-sensitivity-editor](https://github.com/pleak-tools/pleak-sql-derivative-sensitivity-editor) directories all into the same directory and specify their names in the config.json file.
Read more from sub-repositories how to build each module.

## Building

To build the app you need: [NodeJS](http://nodejs.org) with [npm](https://npmjs.org) installed.

To install all project dependencies execute

```
npm install
```

Serve an app locally, build it with

```
npm run build
```

and serve with

```
node server.js
```

## Using

Set up (serve) pleak-backend and pleak-frontend and go to the URL: http://localhost:8000.

## License

MIT
