const test = require('tape-catch');
const httpRequest = require('./helpers/httpRequest');

const createTestCluster = require('./helpers/createTestCluster');
const canhazdb = require('../');

test('create one node', async t => {
  t.plan(1);

  const node = await canhazdb({ host: 'localhost', port: 8061 });

  const request = await httpRequest('http://localhost:8061/tests');

  node.close();

  t.equal(request.status, 404);
});

test('create two node', async t => {
  t.plan(3);

  const [node1, node2] = await Promise.all([
    canhazdb({ host: 'localhost', port: 8061 }),
    canhazdb({ host: 'localhost', port: 8062 })
  ]);

  await Promise.all([
    node1.join('http://localhost:8062'),
    node2.join('http://localhost:8061')
  ]);

  const request = await httpRequest('http://localhost:8061/tests');

  node1.close();
  node2.close();

  t.equal(node1.state.nodes.length, 2);
  t.equal(node2.state.nodes.length, 2);
  t.equal(request.status, 404);
});

test('post: and get some data', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3);
  const node = cluster.getRandomNodeUrl();

  const postRequest = await httpRequest(`${node.url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const getRequest = await httpRequest(`${node.url}/tests/${postRequest.data.id}`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {
    a: 1,
    b: 2,
    c: 3
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('post: and get some data - 404 on another node', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests/notfound`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {});

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 404);
});

test('post: removing old fields', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3);

  const initialPost = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests/${initialPost.data.id}`, {
    method: 'PUT',
    data: {
      d: 4
    }
  });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests/${initialPost.data.id}`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {
    d: 4
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('delete: record returns a 404', async t => {
  t.plan(4);

  const cluster = await createTestCluster(3);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const deleteRequest = await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`, {
    method: 'DELETE'
  });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests/${postRequest.data.id}`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {});

  t.equal(postRequest.status, 201);
  t.equal(deleteRequest.status, 200);
  t.equal(getRequest.status, 404);
});

// test('find: return two records', async t => {
//   t.plan(4);

//   const cluster = await createTestCluster(3);

//   await Promise.all([
//     httpRequest(`${cluster.nodes[1].url}/tests`, {
//       method: 'POST',
//       data: { a: 1, b: 2, c: 3 }
//     }),
//     httpRequest(`${cluster.nodes[1].url}/tests`, {
//       method: 'POST',
//       data: { d: 4, e: 5, f: 6 }
//     }),
//     httpRequest(`${cluster.nodes[1].url}/tests`, {
//       method: 'POST',
//       data: { g: 7, h: 8, i: 9 }
//     })
//   ]);

//   const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests`);

//   cluster.closeAll();

//   t.deepEqual(getRequest.data, [
//     { id: 'a', a: 1, b: 2, c: 3 },
//     { id: 'b', d: 4, e: 5, f: 6 },
//     { id: 'c', g: 7, h: 8, i: 9 }
//   ]);

//   t.equal(getRequest.status, 404);
// });
