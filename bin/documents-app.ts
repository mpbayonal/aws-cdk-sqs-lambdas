#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { DocumentsAppStack } from '../lib/documents-app-stack';

const app = new cdk.App();
new DocumentsAppStack(app, 'DocumentsAppStack');
