import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
var QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/' + process.env.QUEUE;
var sqs = new AWS.SQS({region : 'us-east-1'});

const db = new AWS.DynamoDB.DocumentClient();

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
  DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

export const handler = async (event: any = {}): Promise<any> => {

  if (!event.body) {
    return { statusCode: 400, body: 'invalid request, you are missing the parameter body' };
  }
  const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
  item[PRIMARY_KEY] = uuidv4();
  const params = {
    TableName: TABLE_NAME,
    Item: item
  };

  try {
    await db.update(item).promise();
    try {
      var paramsSQS = {
        MessageBody: JSON.stringify(event),
        QueueUrl: QUEUE_URL
      };
      await sqs.sendMessage(paramsSQS).promise();
    } catch (err) {
      return { statusCode: 500, body: err };
    }
    return { statusCode: 201, body: item };
  } catch (dbError) {
    return { statusCode: 500, body: "error" };
  }
};