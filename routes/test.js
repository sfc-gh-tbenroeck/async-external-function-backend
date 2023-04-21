var express = require('express');
var router = express.Router();

// In-memory "database" for storing messages and responses
// Will not scale to multi nodes and should be replaced with a cache 
const messageDB = new Map();

// Simple delay/sleep function 
function delay(delayms) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, delayms);
  });
}

// The operation function 
async function sum(index, num1, num2) {
  try {
    console.log(`${new Date().getTime()}  - ${index}} - sum started()`)
    
    // The work of the function 
    const result = num1 + num2;
    
    // Add a 1-10 second delay for testing
    await delay(Math.floor(Math.random() * 10000) + 1000);
    
    console.log(`${new Date().getTime()} - ${index}} - sum completed`)

    // The return object can be modified to your use case
    return { isError: false, value: result }

  } catch (error) {
    console.log(`${new Date().getTime()} - ${index}} - sum error ${e.message}`)
    return { isError: true, value: error }
  }
};


// Process the Batch of rows.  The operationFn is the hand off to the function that does the work
async function processBatch(batch, operationFn) {
  console.log(`${new Date().getTime()} - batchId ${batch.batchId} - processBatch() started`);

  // Process the batch in parallel   
  const results = await Promise.all(batch.data.map(async (row) => {
    // Depending on the function there will differing number of columns or augments.  
    // This hand off will work regardless but make sure your operation function arguments matches the external function arguments. 
    const [index, ...args] = row;
    const result = await operationFn(index, ...args);

    // The index is critical for communication with Snowflake 
    // https://docs.snowflake.com/en/sql-reference/external-functions-introduction#label-external-functions-introduction-miniglossary-batch
    return [index, result];
  }));
  console.log(`${new Date().getTime()} - batchId ${batch.batchId} - processBatch() ended`);

  // Update the Saved batch information 
  batch.isComplete = true;
  batch.status = 'complete';
  batch.response = results;

  return;
}

// Asynchronous Endpoint
router.post('/sum', function (req, res, next) {
  // The batchId is critical for communication with Snowflake.
  // https://docs.snowflake.com/en/sql-reference/external-functions-data-format#header-format
  const batchId = req.header('sf-external-function-query-batch-id');
  
  // queryId can be used for logging and tracing 
  const queryId = req.header('sf-external-function-current-query-id');
  
  // JSON Body with an array of arrays 
  // https://docs.snowflake.com/en/sql-reference/external-functions-data-format#body-example
  const data = req.body.data;
  if (!batchId && !data) {
    return res.status(500).json({ error: 'Missing Header or Data' });
  }

  // Save the batch information 
  let batch = {
    batchId: batchId,
    data: data,
    isComplete: false,
    status: 'pending',
    response: null
  }
  messageDB.set(batchId, batch);

  // Call the process batch function without an await so that a 202 can be returned to Snowflake
  processBatch(batch, sum);

  // Return a 202 and Snowflake will poll the GET method of this same function 
  // https://docs.snowflake.com/en/sql-reference/external-functions-implementation#asynchronous-remote-service
  console.log(`${new Date().getTime()} - batchId ${batchId} - Status 202`)
  res.status(202).send();
});


// Asynchronous Get Status Endpoint
// The GET method will be the same for all functions.  You can add multiple functions in this format: '/:type(sum|subtract)'
router.get('/:type(sum)', function (req, res, next) {
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