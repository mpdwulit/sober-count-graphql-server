require("console-pretty-print");

const AWS = require("aws-sdk");

const isLambda = !!(process.env.LAMBDA_TASK_ROOT || false);

if (isLambda) {
  AWS.config.update({
    region: process.env.DROPP_AWS_REGION
  });
} else {
  require("dotenv").config();
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION
  });
}

const { transformArticle } = require("../transformers/article");

// INIT AWS
// env variables set on Lambda function in AWS console

const docClient = new AWS.DynamoDB.DocumentClient();

const defaultParams = {
  TableName: "Addictions^",

  AttributesToGet: [
    "ID",
    "Name",
    "Producer",
    "Translations",
    "Price",
    "Price_rrp",
    "Images",
    "Slug"
  ]
};

const getByParams = params =>
  new Promise((resolve, reject) => {
    docClient.get(params, (err, data) => {
      if (err) {
        console.log("error getting from dynamodb", err);
        reject(err);
      } else {
        const result = transformArticle(data.Item);
        console.log("yay got data from dynamodb", result);
        resolve(result);
      }
    });
  });

const queryByParams = params =>
  new Promise((resolve, reject) => {
    docClient.query(params, (err, data) => {
      if (err) {
        console.log("error getting from dynamodb", err);
        reject(err);
      } else {
        if (data.Items && data.Items.length > 0) {
          const result = transformArticle(data.Items[0]);
          console.log("yay got data from dynamodb", result);
          resolve(result);
        } else {
          reject("no Item Found");
        }
      }
    });
  });

const getAddictionById = async id => {
  const params = {
    ...defaultParams,
    Key: {
      ID: id
    }
  };

  return getByParams(params);
};

// Slug is a GSI (global secondary index) on dynamoDB, so we can not just use ".get()"
// instead we have to use this ugly Condition Syntax
const getArticleBySlug = async slug => {
  const params = {
    TableName: "Articles",
    IndexName: "Slug-index",
    KeyConditionExpression: "Slug = :slugValue",
    ExpressionAttributeValues: {
      ":slugValue": slug
    }
  };

  return queryByParams(params);
};

module.exports = {
  getAddictionById,
  getArticleBySlug
};
