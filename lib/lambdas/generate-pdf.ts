import puppeteer from "puppeteer-serverless";
import * as AWS from 'aws-sdk';
const s3 = new AWS.S3()
const URL_EXPIRATION_SECONDS = 300
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
var QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/' + process.env.QUEUE;
var sqs = new AWS.SQS({region : 'us-east-1'});

const db = new AWS.DynamoDB.DocumentClient();

export const main = async (event: any, context: any): Promise<any> => {
    let browser = null;
    let pdf = null;
    const randomID = 3333
  const Key = `${randomID}.jpg`

    try {
      browser = await puppeteer.launch({});
      const page = await browser.newPage();
      await page.setContent("<html><body><p>Test</p></body></html>", {
        waitUntil: "load",
      });

      pdf = await page.pdf({
        printBackground: true,
        displayHeaderFooter: true,
        margin: {
          top: 40,
          right: 0,
          bottom: 40,
          left: 0,
        },
        headerTemplate: `
          <div style="border-bottom: solid 1px gray; width: 100%; font-size: 11px;
                padding: 5px 5px 0; color: gray; position: relative;">
          </div>`,
        footerTemplate: `
          <div style="border-top: solid 1px gray; width: 100%; font-size: 11px;
              padding: 5px 5px 0; color: gray; position: relative;">
              <div style="position: absolute; right: 20px; top: 2px;">
                <span class="pageNumber"></span>/<span class="totalPages"></span>
              </div>
          </div>
        `,
      });
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }

    const s3Params = {
      Bucket: process.env.UploadBucket,
      Key,
      Expires: URL_EXPIRATION_SECONDS,
      ContentType: 'image/jpeg'
    }
    const uploadURL = await s3.getSignedUrlPromise('putObject', s3Params)
    try {
      const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
      const params = {
        TableName: TABLE_NAME,
        Item: item
      };
      await db.put(params).promise();
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
}
