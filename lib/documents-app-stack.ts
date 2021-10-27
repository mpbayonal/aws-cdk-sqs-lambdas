
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import * as lambda from "@aws-cdk/aws-lambda";
import { AssetCode, Function, Runtime } from '@aws-cdk/aws-lambda';
import {SqsEventSource} from '@aws-cdk/aws-lambda-event-sources';
import { UserPool } from '@aws-cdk/aws-cognito'
import * as s3 from '@aws-cdk/aws-s3';
import { LambdaRestApi, CfnAuthorizer, AuthorizationType,IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from '@aws-cdk/aws-apigateway';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { App, Stack, RemovalPolicy } from '@aws-cdk/core';
import { NodejsFunction, NodejsFunctionProps } from '@aws-cdk/aws-lambda-nodejs';
import { join } from 'path'

export class DocumentsAppStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'DocumentsAppQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });
    const url = queue.queueUrl;
    const bucket = new s3.Bucket(this, 'SampleBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    const bucketName = bucket.bucketName;


    const dynamoTable = new Table(this, 'items', {
      partitionKey: {
        name: 'itemId',
        type: AttributeType.STRING
      },
      tableName: 'items',

      /**
       *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new table, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will delete the table (even if it has data in it)
       */
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
      depsLockFilePath: join(__dirname, 'lambdas', 'package-lock.json'),
      environment: {
        PRIMARY_KEY: 'itemId',
        TABLE_NAME: dynamoTable.tableName,
        QUEUE:url,
        BUCKET:bucketName
      },
      runtime: Runtime.NODEJS_14_X,
    }

    
  
    const generatePDF = new lambda.Function(this, "generatePDF", {
      runtime: lambda.Runtime.NODEJS_10_X, // So we can use async in widget.js
      code: lambda.Code.fromAsset('lib/lambdas'),
      handler: "generate-pdf.main",
      environment: {
        PRIMARY_KEY: 'itemId',
        TABLE_NAME: dynamoTable.tableName,
        QUEUE:url,
        BUCKET:bucketName
      }
    });
    const getPDF = new lambda.Function(this, "getPDF", {
      runtime: lambda.Runtime.NODEJS_10_X, // So we can use async in widget.js
      code: lambda.Code.fromAsset('lib/lambdas'),
      handler: "get-pdf.main",
      environment: {
        PRIMARY_KEY: 'itemId',
        TABLE_NAME: dynamoTable.tableName,
        QUEUE:url,
        BUCKET:bucketName
      }
    });

    const sendForm = new NodejsFunction(this, 'sendForm', {
      entry: join(__dirname, 'lambdas', 'send-form.ts'),
      ...nodeJsFunctionProps,
    });
    const login = new NodejsFunction(this, 'login', {
      entry: join(__dirname, 'lambdas', 'login.ts'),
      ...nodeJsFunctionProps,
    });

          // 👇 add sqs queue as event source for lambda
      generatePDF.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 10,
      }),
    );
  
   
  
    dynamoTable.grantReadWriteData(getPDF);
    dynamoTable.grantReadWriteData(sendForm);
    dynamoTable.grantReadWriteData(login);
    dynamoTable.grantReadWriteData(generatePDF);


    // Integrate the Lambda functions with the API Gateway resource
    const getPDFIntegration = new LambdaIntegration(getPDF);
    const sendFormIntegration = new LambdaIntegration(sendForm);
    const loginIntegration = new LambdaIntegration(login);




    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, 'itemsApi', {
      restApiName: 'Items Service'
    });

    const items = api.root.addResource('document');
    items.addMethod('POST', sendFormIntegration);
    const loginMethod = api.root.addResource('login');
    loginMethod.addMethod('GET', loginIntegration);

    const singleItem = items.addResource('{id}');
    singleItem.addMethod('GET', getPDFIntegration);

      
    }


  }
