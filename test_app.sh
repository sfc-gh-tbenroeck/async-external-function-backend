#!/bin/bash

if ! command -v jq &> /dev/null
then
	echo "Test script requires 'jq' - use 'brew install jq'"
	exit
fi

curl -X POST -H "Content-Type: application/json"  -H "sf-external-function-query-batch-id: 123123123" -d '{"data": [[0, 0, 0], [1, 101, 101], [2, 202, 202], [3, 303, 303], [4, 404, 404]]}' "http://localhost:3000/test/sum"

echo "Started curl test, submitted 5 records to function via POST"
echo -n "Looping GET every second to check for completion"

i=0
while [ $i -lt 50 ]
do
	{
	r=`curl -s -X GET -H "Content-Type: application/json"  -H "sf-external-function-query-batch-id: 123123123" "http://localhost:3000/test/sum" | jq -r ".data" 2> /dev/null`
	} && {	
		echo "done"
		echo -n "Response: "
		echo $r
		exit 0
	}	
	echo -n "."
	sleep 1
	((i=i+1))
done

echo -n "test failed"

