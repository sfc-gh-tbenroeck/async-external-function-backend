# Asyc Snowflake External Function Backend
This is a very simple backend to use for rapid prototyping and testing external functions.


## Create the function
 - Use `routes/test.js` as a template for adding your own function.  Duplicate and rename the file for your function.
 - Update `app.js` to include your function into the application.

## Test Locally
If you have node installed locally run:
  - `npm install`
  - `npm start`
  - The default port is `3000` but can be changed by setting `process.env.PORT`

## Build / Test Container
If you do not have node installed or you prefer docker run:
  - `docker build -t async-ext-func:latest .`
  - `docker run -it -p 3000:3000 async-ext-func:latest`

## Test Endpoints
Once the app is running you can test your functions by providing a batch id and matching the body request from Snowflake:
  - `curl -X POST -H "Content-Type: application/json"  -H "sf-external-function-query-batch-id: 123123123" -d '{"data": [[0, 0, 0], [1, 101, 101], [2, 202, 202], [3, 303, 303], [4, 404, 404]]}' "http://localhost:3000/test/sum"`

There is a delay in sum() is to allow for testing polling for status:
  - `curl -X GET -H "Content-Type: application/json"  -H "sf-external-function-query-batch-id: 123123123" "http://localhost:3000/test/sum"`

## Azure OPENAI Route
Optionally rename the `.env.template` file to `.env` for local testing.  The `.env` file is not being added to the Dockerfile but you can choose to do so. Update the values for your Azure OpenAI Deployement.  Run and Test using the following commands:
```
docker run -it -p 3000:3000 -e AZURE_OPENAI_BASE="https://YOUROPENAI.openai.azure.com/" -e AZURE_OPENAI_KEY="YOUR_SECRET_KEY" -e AZURE_OPENAI_DEPLOYMENTID="YOUR_DEPLOYMENT_ID" async-ext-func:latest

curl -X POST -H "Content-Type: application/json" -H "sf-external-function-query-batch-id: 123123123" -d '{"data": [[0, "when is easter in 2024"], [1, "what day of the week in Christmas on in 2024"], [2, "What day of the week is Christmas"], [3, "What are some good places to visit in Bend, OR?"], [4, "What is half of sixty?"]]}' "http://localhost:3000/openai/v1/chat/completions"

curl -X GET -H "Content-Type: application/json"  -H "sf-external-function-query-batch-id: 123123123" "http://localhost:3000/openai/v1/chat/completions"
```

## Deploy to Azure
If you want to deploy to Azure and have the CLI installed you can run:
  - `az webapp up -g ResourceGroup -n NameOfWebapp`

## Add External Function to Snowflake
Follow the documentation for your cloud provider to create the API Integration
  - [AWS](https://docs.snowflake.com/en/sql-reference/external-functions-creating-aws)
  - [Azure](https://docs.snowflake.com/en/sql-reference/external-functions-creating-azure)
  - [GCP](https://docs.snowflake.com/en/sql-reference/external-functions-creating-gcp)

### Create the external function in Snowflake to match the operation function you added.
````
CREATE OR REPLACE EXTERNAL FUNCTION extSum(num1 int, num2 int)
    RETURNS variant
    api_integration = snwflkeextfunc
    AS 'https://YOUR-PROXY.azure-api.net/test/sum';
````
### Test the external function by running a query:
  - `SELECT extSum(60,6);`
