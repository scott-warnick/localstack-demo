// This is the content for: /workspaces/localstack-demo/demo/lambdas/app.js

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const documentClient = new AWS.DynamoDB.DocumentClient({
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:4566', // ensure this is set correctly by LocalStack
    region: 'us-east-1'
});
const sqs = new AWS.SQS({
    endpoint: process.env.SQS_ENDPOINT || 'http://localhost:4566', // ensure this is set correctly by LocalStack
    region: 'us-east-1'
});

const TABLE_NAME = 'appRequests';
// You might need to derive this from your serverless.yml or LocalStack logs if it's not correctly set via env vars
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/requestQueue';

exports.handleRequest = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Define CORS headers for all responses
    const headers = {
        'Access-Control-Allow-Origin': '*', // Allows requests from any origin
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET' // List all methods your API supports
    };

    // Handle OPTIONS preflight request (REQUIRED for CORS)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: '' // OPTIONS requests typically have an empty body
        };
    }

    try {
        if (event.httpMethod === 'POST') {
            const requestId = uuidv4();
            const timestamp = Date.now();
            const item = {
                id: 'request', // Partition key
                requestID: requestId, // Sort key
                timestamp: timestamp,
                status: 'RECEIVED'
            };

            await documentClient.put({
                TableName: TABLE_NAME,
                Item: item
            }).promise();

            // SQS Queue URL might need to be resolved correctly if environment variable isn't propagated
            // In LocalStack, it often defaults to http://localhost:4566/000000000000/QueueName
            // or is directly accessible via a service endpoint.
            // Ensure SQS_QUEUE_URL is properly set by your serverless.yml or via an env var in LocalStack.
            await sqs.sendMessage({
                QueueUrl: SQS_QUEUE_URL,
                MessageBody: JSON.stringify({ requestId: requestId })
            }).promise();

            return {
                statusCode: 200,
                headers: headers, // Include headers in success response
                body: JSON.stringify({ message: 'Request created and sent to queue', requestId: requestId })
            };
        } else if (event.httpMethod === 'GET') {
            const data = await documentClient.query({
                TableName: TABLE_NAME,
                KeyConditionExpression: 'id = :id',
                ExpressionAttributeValues: {
                    ':id': 'request'
                }
            }).promise();

            return {
                statusCode: 200,
                headers: headers, // Include headers in success response
                body: JSON.stringify({ requests: data.Items || [] })
            };
        }

        // Fallback for unsupported methods
        return {
            statusCode: 405, // Method Not Allowed
            headers: headers,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };

    } catch (error) {
        console.error('Error in Lambda:', error);
        return {
            statusCode: 500,
            headers: headers, // Include headers in error response too
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message })
        };
    }
};