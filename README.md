# pleak-frontend

The user-facing part of the Privacy Leak Tools

v0.0.4

## Prerequisites

You need to have [pleak-backend](https://github.com/pleak-tools/pleak-backend), pleak-frontend, [pleak-sql-analysis](https://github.com/pleak-tools/pleak-sql-analysis) and [pleak-sql-editor](https://github.com/pleak-tools/pleak-sql-editor) directories all in the same directory and their names specified in the config.json file. All parts (except backend) must be built separately.

## Building

To build an app you need: [NodeJS](http://nodejs.org) with [npm](https://npmjs.org) installed.

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

Pleak-backend and pleak-frontend running, go to the URL: http://localhost:8000.

## License

MIT
