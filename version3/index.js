const line = require('@line/bot-sdk');
const azure = require("azure-storage");
const fs = require('fs');

const client = new line.Client({
    channelAccessToken: process.env.ACCESS_TOKEN  
});

const blUrl =
  "https://nekobot3raspi8pic.blob.core.windows.net/nekoboto-pic-cont/";
const pic = "/ieneko.jpg";
let ownerCont = "";
let ownerUrl = "";

let uploadpath = {};
let fileName = "upload.jpg";
var filePath = "./" + fileName;

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    console.log(req);

//動画の種類ごとに保存
if (req.body && req.body.events[0]) {
  if (req.body.events[0].type === "postback") {
    if (req.body.events[0].postback.data === "toys" || req.body.events[0].postback.data === "treat" || req.body.events[0].postback.data === "food" ) {
      //console.log("2",event.postback.data);
      uploadpath[req.body.events[0].source.userId] = req.body.events[0].postback.data;
      return client.replyMessage(req.body.events[0].replyToken, {
        type: "text", text: req.body.events[0].postback.data + "ですね！動画をUPしてください"
      });
    }
    // return;
  } else if(req.body.events[0].type === "message" && req.body.events[0].message.type === "video"){
    const ownerid = await getOwnerUrl(req.body.events[0].source.userId);
    //const downloadPath = "./" + uploadpath[req.body.events[0].source.userId] + ".mp4";
    const downloadPath = "upload.mp4";
    //const downloadPath = process.env.TMP + "\\" + "upload.mp4";  // Azure Functionsでの一時ファイルの書き込み
    //console.log("process.env: %j", process.env);  // Azure Functionsでの環境変数
    console.log("downloadPath: " + downloadPath);

    //let getContent = await downloadContent(req.body.events[0].message.id, downloadPath,ownerid);
    let getContent = await downloadContent_Azure(req.body.events[0].message.id, downloadPath,ownerid);
    console.log("koko: " + getContent);
  
    return client.replyMessage(req.body.events[0].replyToken, [
      {
        type: "text",
        text: `${downloadPath}として保存しました。`,
      },
    ]);

  } else if(req.body.events[0].type === "message" && req.body.events[0].message.type === "image"){
    const ownerid = await getOwnerUrl(req.body.events[0].source.userId);
    //const downloadPath = "./" + fileName;
    const downloadPath = fileName;
    //const downloadPath = process.env.TMP + "\\" + fileName;  // Azure Functionsでの一時ファイルの書き込み
    //console.log("process.env: %j", process.env);  // Azure Functionsでの環境変数
    console.log("downloadPath: " + downloadPath);

    //let getContent = await downloadContent(req.body.events[0].message.id, downloadPath,ownerid);
    let getContent = await downloadContent_Azure(req.body.events[0].message.id, downloadPath,ownerid);
    console.log("koko: " + getContent);

    return client.replyMessage(req.body.events[0].replyToken, [
      {
        type: "text",
        text: `${downloadPath}として保存しました。`,
      },
    ]);

  }
  else{
    context.res = {
        status: 200,
        body: "Please check the query string in the request body"
    }; 
  }
} else {
    context.res = {
        status: 200,
        body: "Please check the query string in the request body"
    }; 
  }
}



const getOwnerUrl = async (userId) => {
  return new Promise((resolve, reject) => {
    // table 操作
    // Azure Storage の接続文字列を環境変数から取得
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (typeof connectionString === "undefined") {
      console.error("AZURE_STORAGE_CONNECTION_STRING is not set");
      process.exit(1);
    }
    // TableService オブジェクトを取得
    const tableService = new azure.TableService(connectionString);
    // table 情報取得
    const query = new azure.TableQuery()
      .where("PartitionKey eq ?", "owner")
      .and("RowKey eq ?", userId) // かつ RowKey が useridである
      .select("Name");
    tableService.queryEntities("users", query, null, function (error, result) {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      const entries = result.entries;
      // NAMEを取得
      ownerCont = entries[0].Name["_"];

      resolve(ownerCont);
    });
  });
};

//ダウンロード関数

function downloadContent(messageId, downloadPath, ownerid) {
  // const ownerid = await getOwnerUrl(event.source.userId);
  // Azure上のBLOBストレージとの接続用サービスオブジェクト
  // 引数にBLOBストレージのConnectionStringを設定
  var blobSvc = azure.createBlobService(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  //const tmp_downloadPath = process.env.TMP + "\\" + downloadPath;  // Azure Functions
  return client.getMessageContent(messageId).then(
    (stream) =>
      new Promise((resolve, reject) => {
        const writable = fs.createWriteStream(downloadPath);
        //const writable = fs.createWriteStream(tmp_downloadPath);  // Azure Functions
        stream.pipe(writable);
        stream.on("end", () => resolve(downloadPath));
        //stream.on("end", () => resolve(tmp_downloadPath));  // Azure Functions
        //stream.on('error', reject);

        stream.on("close", function () {
          blobSvc.createBlockBlobFromLocalFile(
            "nekoboto-pic-cont",
            ownerid + "/" + downloadPath,
            downloadPath,
            //tmp_downloadPath,  // Azure Functions
            function (error, result, response) {
              if (!error) {
                console.log("アップロード成功");
              } else {
                console.log(error);
              }
            }
          );
        });
      })
  );
}

function downloadContent_Azure(messageId, downloadPath, ownerid) {
  // const ownerid = await getOwnerUrl(event.source.userId);
  // Azure上のBLOBストレージとの接続用サービスオブジェクト
  // 引数にBLOBストレージのConnectionStringを設定
  var blobSvc = azure.createBlobService(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  const tmp_downloadPath = process.env.TMP + "\\" + downloadPath;  // Azure Functions
  return client.getMessageContent(messageId).then(
    (stream) =>
      new Promise((resolve, reject) => {
        //const writable = fs.createWriteStream(downloadPath);
        const writable = fs.createWriteStream(tmp_downloadPath);  // Azure Functions
        stream.pipe(writable);
        //stream.on("end", () => resolve(downloadPath));
        stream.on("end", () => resolve(tmp_downloadPath));  // Azure Functions
        //stream.on('error', reject);

        stream.on("close", function () {
          blobSvc.createBlockBlobFromLocalFile(
            "nekoboto-pic-cont",
            ownerid + "/" + downloadPath,
            //downloadPath,
            tmp_downloadPath,  // Azure Functions
            function (error, result, response) {
              if (!error) {
                console.log("アップロード成功");
              } else {
                console.log(error);
              }
            }
          );
        });
      })
  );
}
