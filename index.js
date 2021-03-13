const line = require('@line/bot-sdk');
const azure = require("azure-storage");
const fs = require('fs');

const client = new line.Client({
    channelAccessToken: process.env.ACCESS_TOKEN  
});

const blUrl = "https://nekobot3raspi8pic.blob.core.windows.net/nekoboto-pic-cont/";
const pic = "/ieneko.jpg";
let ownerCont = "";
let ownerUrl = "";

let uploadpath = {};
let fileName = "upload.jpg";

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    console.log(req);

    if (req.query.message || (req.body && req.body.events)) {
        if (req.body && req.body.events[0]) {
            if(req.body.events[0].type === "message" && req.body.events[0].message.type === "video"){
                const ownerid = await getOwnerUrl(req.body.events[0].source.userId);
                const downloadPath = "./" + "upload.mp4";
              
                let getContent = await downloadContent(req.body.events[0].message.id, downloadPath,ownerid);
                console.log("koko" + getContent);
              
                return client.replyMessage(req.body.events[0].replyToken, [
                  {
                    type: "text",
                    text: `${getContent}として保存しました。`,
                  },
                ]);
            }
            else if(req.body.events[0].type === "message" && req.body.events[0].message.type === "image"){
                const ownerid = await getOwnerUrl(req.body.events[0].source.userId);
                const downloadPath = "./" + fileName;
              
                let getContent = await downloadContent(req.body.events[0].message.id, downloadPath,ownerid);
                console.log("koko" + getContent);
              
                return client.replyMessage(req.body.events[0].replyToken, [
                  {
                    type: "text",
                    text: `${getContent}として保存しました。`,
                  },
                ]);
            }
            else {
                return client.replyMessage(req.body.events[0].replyToken, {
                    type: "text",
                    text: "MENUからえらんでね",
                });
                // return client.replyMessage(req.body.events[0].replyToken, flexm);
            }
        }
    }
    else {
        context.res = {
            status: 200,
            body: "Please check the query string in the request body"
        };
    };
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
    return client.getMessageContent(messageId).then(
        (stream) =>
        new Promise((resolve, reject) => {
            const writable = fs.createWriteStream(downloadPath);
            stream.pipe(writable);
            stream.on("end", () => resolve(downloadPath));
            //stream.on('error', reject);
  
            stream.on("close", function () {
                blobSvc.createBlockBlobFromLocalFile(
                    "nekoboto-pic-cont",
                    ownerid + "/" + downloadPath,
                    downloadPath,
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
