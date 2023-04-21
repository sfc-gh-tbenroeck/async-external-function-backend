var express = require('express');
var router = express.Router();

// In-memory "database" for storing messages and responses
const messageDB = new Map();

function delay(delayms) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, delayms);
  });
}

async function sum(index, num1, num2) {
  try {
    console.log(`${new Date().getTime()}  - ${index}} - sum started()`)
    const result = num1 + num2;
    
    // Add delay for testing: random 1-10 seconds
    await delay(Math.floor(Math.random() * 10000) + 1000);
    
    console.log(`${new Date().getTime()} - ${index}} - sum completed`)
    return { isError: false, value: result }
  } catch (error) {
    console.log(`${new Date().getTime()} - ${index}} - sum error ${e.message}`)
    return { isError: true, value: error }
  }
};

async function subtract(index, num1, num2, num3) {
  try {
    console.log(`${new Date().getTime()} - ${index}} - subtract started()`)
    const result = num1 - num2 - num3;
    console.log(`${new Date().getTime()} - ${index}} - subtract completed`)
    return { isError: false, value: result }
  } catch (error) {
    console.log(`${new Date().getTime()} - ${index}} - subtract error ${e.message}`)
    return { isError: true, value: error }
  }
};

async function processBatch(batch, operationFn) {
  console.log(`${new Date().getTime()} - batchId ${batch.batchId} - processBatch() started`);
  const results = await Promise.all(batch.data.map(async (row) => {
    const [index, ...args] = row;
    const result = await operationFn(index, ...args);
    return [index, result];
  }));
  console.log(`${new Date().getTime()} - batchId ${batch.batchId} - processBatch() ended`);

  batch.isComplete = true;
  batch.status = 'complete';
  batch.response = results;
  return;
}

// Asynchronous  Endpoint
router.post('/sum', function (req, res, next) {
  const batchId = req.header('sf-external-function-query-batch-id');
  const data = req.body.data;
  if (!batchId && !data) {
    return res.status(500).json({ error: 'Missing Header or Data' });
  }

  let batch = {
    batchId: batchId,
    data: data,
    isComplete: false,
    status: 'pending',
    response: null
  }
  messageDB.set(batchId, batch);
  processBatch(batch, sum);
  console.log(`${new Date().getTime()} - batchId ${batchId} - Status 202`)
  res.status(202).send();
});

// Asynchronous Reply Endpoint
router.post('/subtract', function (req, res, next) {
  const batchId = req.header('sf-external-function-query-batch-id');
  const data = req.body.data;
  if (!batchId && !data) {
    return res.status(500).json({ error: 'Missing Header or Data' });
  }

  let batch = {
    batchId: batchId,
    data: data,
    isComplete: false,
    status: 'pending',
    response: null
  }
  messageDB.set(batchId, batch);
  processBatch(batch,subtract)
  console.log(`${new Date().getTime()} - batchId ${batchId} - Status 202`)
  res.status(202).send();
});

// Asynchronous Get Status Endpoint
router.get('/:type(sum|subtract)', function (req, res, next) {
  const batchId = req.header('sf-external-function-query-batch-id');
  const batchResults = messageDB.get(batchId);
  if (!batchResults) {
    console.log(`${new Date().getTime()} - batchId ${batchId} - Status 404`)
    res.status(404).send(`Could not locate batchId ${batchId}`);
  } else if (batchResults.isComplete) {
    console.log(`${new Date().getTime()} - batchId ${batchId} - Status 200`)
    res.status(200).send({ "data": batchResults.response })
  } else {
    console.log(`${new Date().getTime()} - batchId ${batchId} - ${batchResults.status} - Status 202`)
    res.status(202).send(`batchId ${batchId} is ${batchResults.status}`);
  }
});

module.exports = router;