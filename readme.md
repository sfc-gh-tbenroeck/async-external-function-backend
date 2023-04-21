# Asyc Snowflake External Function Backend 


## Create a new function for the external function. 
```
async function sum(index, num1, num2) {
  try {
    console.log(`${new Date().getTime()}  - ${index}} - sum started()`)
    const result = num1 + num2;
    await delay(Math.floor(Math.random() * 30000) + 10000);
    console.log(`${new Date().getTime()} - ${index}} - sum completed`)
    return { isError: false, value: result }
  } catch (error) {
    console.log(`${new Date().getTime()} - ${index}} - sum error ${e.message}`)
    return { isError: true, value: error }
  }
};
```

## Create the API POST Route for the external function
```
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
```

## Add the API GET Route for the external functon. 
```
// Asynchronous Get Status Endpoint
router.get('/:type(sum|subtract)' ...
```

## Test Locally 
node ./bin/www

## Build / Test Container 
docker build -t benroeck-async-ext:latest .  
docker run -it -p 3000:3000 benroeck-async-ext:latest

## Test Endpoints.
_The delay in sum() is for testing_
```
curl -X POST -H "Content-Type: application/json"  -H "sf-external-function-query-batch-id: 123123123" -d '{"data": [[0, 0, 0], [1, 101, 101], [2, 202, 202], [3, 303, 303], [4, 404, 404]]}' "http://localhost:3000/sum"
```
```
curl -X GET -H "Content-Type: application/json"  -H "sf-external-function-query-batch-id: 123123123" "http://localhost:3000/sum"
```

## Deploy to Azure
az webapp up -g ResourceGroup -n NameOfWebapp

## Build / Test Container 
docker build -t benroeck-async-ext:latest .  
docker run -it -p 3000:3000 benroeck-async-ext:latest
