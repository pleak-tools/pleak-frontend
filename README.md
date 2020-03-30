# Pleak frontend

The user-facing part of the Privacy LEAKage (PLEAK) Tools

## Prerequisites

You need to locate pleak-frontend, [pleak-backend](https://github.com/pleak-tools/pleak-backend), [pleak-sql-analysis](https://github.com/pleak-tools/pleak-sql-analysis), [pleak-leaks-when-ast-transformation](https://github.com/pleak-tools/pleak-leaks-when-ast-transformation), [pleak-leaks-when-analysis](https://github.com/pleak-tools/pleak-leaks-when-analysis), [pleak-leakage-detection-analysis](https://github.com/pleak-tools/pleak-leakage-detection-analysis), [pleak-sql-constraint-propagation](https://github.com/pleak-tools/pleak-sql-constraint-propagation), [pleak-pe-bpmn-editor](https://github.com/pleak-tools/pleak-pe-bpmn-editor), [pleak-guessing-advantage-editor](https://github.com/pleak-tools/pleak-guessing-advantage-editor) and [pleak-sensitivities-editor](https://github.com/pleak-tools/pleak-sensitivities-editor) directories all into the same directory and specify their names in the src/config.json file.
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
