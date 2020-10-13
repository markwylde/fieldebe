const packageJson = require('./package.json');

const writeResponse = require('write-response');
const finalStream = require('final-stream');

function handleGet (state, request, response, resourceUrl) {
  const data = state.data[resourceUrl];

  if (!data) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, data, response);
}

async function handlePost (state, request, response, resourceUrl) {
  const body = await finalStream(request).then(JSON.parse);

  state.data[resourceUrl] = state.data[resourceUrl] || {};
  Object.assign(state.data[resourceUrl], body);

  writeResponse(200, {}, response);
}

async function handleDelete (state, request, response, resourceUrl) {
  delete state.data[resourceUrl];

  writeResponse(200, {}, response);
}

async function handleInternal (state, request, response) {
  if (request.url === '/_info') {
    writeResponse(200, {
      version: packageJson.version
    }, response);
    response.end();
    return;
  }

  const resourceUrl = request.url.substr('/_internal'.length);

  if (request.method === 'GET') {
    handleGet(state, request, response, resourceUrl);
    return;
  }

  if (request.method === 'POST') {
    handlePost(state, request, response, resourceUrl);
    return;
  }

  if (request.method === 'DELETE') {
    handleDelete(state, request, response, resourceUrl);
    return;
  }

  writeResponse(404, {}, response);
}

module.exports = handleInternal;
