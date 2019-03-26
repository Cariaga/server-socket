// server.js
"use strict";

//ServerMode
let ServerMode = "Debug";

// set up ========================
var helmet = require('helmet');
//var sqlinjection = require('sql-injection');// disable because it blocks token access
var express = require('express');
const routes = require('express').Router();
//var Nexmo = require('nexmo');
var app = express(); // create our app w/ express
app.use(helmet());
var fs = require('fs')
var morgan = require('morgan'); // log requests to the console (express4)
var bodyParser = require('body-parser'); // pull information from HTML POST (express4)
var beautify = require("json-beautify");
//const sendmail = require('sendmail')();
const url = require('url');
const stringify = require('json-stringify');
var request = require('request');
const Enumerable = require('linq');
var cors = require('cors');
const busboy = require('express-busboy');
const notifyRouter = busboy.extend(express.Router());
app.use(function (req, res, next) {
  
  // Website you wish to allow to connect
  var allowedOrigins = ['http://127.0.0.1:8020', 'http://localhost:8020', 'http://127.0.0.1:8080', 'http://127.0.0.1:9000', 'http://localhost:9000', 'http://localhost:8080'];
  var origin = req.headers.origin;
  res.header("Access-Control-Allow-Origin", "*");
  // Request methods you wish to allow
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,OPTIONS');
  // Request headers you wish to allow
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Headers', 'Content-Type', 'X-Auth-Token');
  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.header('Access-Control-Allow-Credentials', true);
    next();
});
app.options('*', cors());//to support webgl request and resolve post routing to option 
//app.options('/Api/v1/Game/Login/', cors());// alternativly better than the app * 


// configuration =================


app.use(express.static('AdminSocket'));
//app.use(express.static('WalletOne'));

//app.use(express.static(__dirname + '/public')); // set the static files location /public/img will be /img for users
app.use(express.static(__dirname + '/Webgl'));

app.use(morgan('combined')); // log every request to the console
app.use(bodyParser.urlencoded({
  'extended': 'true'
})); // parse application/x-www-form-urlencoded


app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.json({
  type: 'application/vnd.api+json'
})); // parse application/vnd.api+json as json
var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';


//===========API===========
let ConnectionMode=require('./API/SharedController/ConnectionMode');
var uuidv4 = require('uuid/v4');
var RedisConnect=require("./API/SharedController/RedisConnect");


//redis test example
RedisConnect.SetMoneyAtRoom("Account1","room1",10);
RedisConnect.SetMoneyAtRoom("Account2","room1",10);

RedisConnect.GetMoneyAtRoom("Account1","room1",function(res){
  console.log("redis get result : "+res);
});


//--Login End
app.get('/',function (req, res) {
  //redis.set('foo', 'bar');
  res.sendStatus(200);
});
console.log("ConnectionMode : "+ConnectionMode.getMainAddressByProductionMode());

let totalSocketBytes=0;
var sizeof = require('object-sizeof');
const SocketServer = require('ws').Server;
let PortByConnectionMode = ConnectionMode.getPortByProductionMode();


const server = app
  .listen(PortByConnectionMode, () => console.log(`Listening on ${ PortByConnectionMode }`));

const wss = new SocketServer({
  server
});
let ConnectedUsers = 0;


function LatestAndUnique(distinctlist, LookUp) {
  return Enumerable.from(distinctlist).first(x => x.UserAccountID == LookUp);
}


function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

Array.prototype.pushIfNotExist = function(element, comparer) { 
  if (!this.inArray(comparer)) {
      this.push(element);
  }
}; 

wss.on('connection', (ws, req) => {
  ConnectedUsers++;
  console.log('Client connected ' + ConnectedUsers);
  const parameters = url.parse(req.url, true);
  var UserAccountID = parameters.query.UserAccountID;
  
  ws.UserAccountID = UserAccountID;
  ws.InstanceID = uuidv4();
  ws.DepositNotice = "";
  ws.ParentUserAccountIDList=[];
  ws.isLobby=true;
  ws.WinPoints = 0;
  ws.PlayerCommission = 0;
  
  /*ws.Rooms=[];*/

/*--------Start Player Checking First Socket*/
  ws.isLeadSocket=true;//becomes false instead if an  existing player same account is found
  wss.clients.forEach((client) => {
    if (client.UserAccountID ==UserAccountID&& ws.InstanceID!=client.InstanceID) {//makes sure i'm not checking my self and check if anothor same account exist
     ws.isLeadSocket=false;
      /*console.log(client.UserAccountID); */
    }
  });

/*-------End Player Checking First Socket*/

function LateStart(){
  wss.clients.forEach((client) => {
    if (client.readyState == 1) {
      if(ws.ParentUserAccountIDList!=null && ws.ParentUserAccountIDList != undefined ){

        let ParentUserAccountIDList = ws.ParentUserAccountIDList.split(",");

        for(let i=0;i<ParentUserAccountIDList.length;++i){

          if(ParentUserAccountIDList[i]==client.UserAccountID&&ws.UserAccountID!=client.UserAccountID){
            console.log("Index : "+i+" count : "+ParentUserAccountIDList.length+" connection Parent To Notify "+client.UserAccountID);
            client.send(stringify({
              Response: "Connect",
              UserAccountID : ws.UserAccountID
            }, null, 0));
          }
        }
      }
     
    }
  });
}
setTimeout(function(){LateStart(); }, 5000);//wait for a while before offically notifying new connection 

/*the http approch is used because direct to database access is not allowed*/
request(ConnectionMode.getMainAddressByProductionMode()+'/GetBasicInformation/UserAccountID/'+UserAccountID, function (error, response, result) {
   // console.log('error:', error); // Print the error if one occurred
   // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    let body =  JSON.parse(result);
    ws.UserName = body.UserName;
    ws.WinPoints = body.WinPoints;
    ws.PlayerCommission = body.PlayerCommission;
    ws.Money = body.Money;
    ws.ScreenName = body.ScreenName;

    let ParentUserAccountIDList = body.ParentUserAccountID; 
    ws.ParentUserAccountIDList = ParentUserAccountIDList;



   // ParentListOfPlayer();
    //console.log('body result:', body); 
  });


  ///RedisConnect.SetMoneyAtRoom("TestAccount", "TestRoom","TestBuyiN");//set the recent buyIn Money of all rooms of a specific userAccount from LeadAccount


  //Get 
  /*GetBasicInformation(UserAccountID,function(BasicInformation){
    ws.UserName = BasicInformation.UserName;
    ws.WinPoints = BasicInformation.WinPoints;
    ws.PlayerCommission = BasicInformation.PlayerCommission;

    var query2 = "UPDATE `sampledb`.`useraccounts` SET `OnlineStatus` = 'Online' WHERE (`UserAccountID` = \'"+UserAccountID+"\');";
    DBConnect.DBConnect(query2, function (response) {
      if (response != undefined) {
        
      }
    });
  });*/


  //--inisialization to Same Account instances // similar to all buffer
  var SyncRoomVar = undefined;


  wss.clients.forEach((client) => {
    if (SyncRoomVar == undefined && client.UserAccountID == ws.UserAccountID) { //matching user account connecting to a diffrent application instance
      SyncRoomVar = client.Rooms;
      //console.log(client.UserAccountID); 
    }
   
  });
  if (SyncRoomVar != undefined) {

    ws.Rooms = SyncRoomVar;
    SyncRoomVar = undefined;
  }

  //console.log(ws.Money);
  
  
/*
  var query = "SELECT `Money` FROM sampledb.players WHERE `UserAccountID` = \'" + UserAccountID + "\';";
  DBConnect.DBConnect(query, function (response) {
    if (response != undefined) {
      //ws.Money = parseInt(response[0].Money);
      
      //console.log(response[0]);
    }
  });*/

  /*function ParentListOfPlayer(){//this is needed by the websocket debugger  no loger used because newer version is under request(ConnectionMode.getMainAddressByProductionMode()+'/GetBasicInformation/UserAccountID/
    var ParentsUserAccountsQuery = "SELECT ParentUserAccountID FROM sampledb.player_treebranch_indirect where PlayerUserAccountID=\'"+UserAccountID+"\';";
    //console.log(ParentsUserAccountsQuery);
    DBConnect.DBConnect(ParentsUserAccountsQuery, function (response) {
      if (response != undefined) {
        let ParentUserAccountIDList = response.map(x=>x.ParentUserAccountID); 
        ws.ParentUserAccountIDList = ParentUserAccountIDList;
      //  console.log("Ok "+ParentUserAccountIDList.length);
      }
    });
  }*/


  
  // Update Player variables Listing upon inisialization of a same useraccount to match the oldest index useraccount
  // console.log("url: ", ws);
  //Developer note : it seams direct editing of db money won't affect the real money of the player but it dose work without problem with an actual deposit  which is good
  //editing the money in the db shouln't happend without updating the socket aswell
  ws.onmessage = function (event) {
    //clients.size to get the length of the sockets connections

    


    //console.log(event.data);
    if (IsJsonString(event.data)) {

      totalSocketBytes +=sizeof(event.data);
      let Object = JSON.parse(event.data);
      //console.log(Object);
   
         /*admin related */
      if (Object.Type == "NotifyPlayerDeposit") {
        console.log("NotifyPlayerDeposit :" +Object.UserAccountID);
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            if (client.UserAccountID == Object.MessageReceiver) {
                  client.DepositNotice = Object.DepositNotice; 
                  let DepositUUID = Object.DepositUUID;
                  if(DepositUUID!=""){
                    console.log("Deposit UUID"+DepositUUID);
                    //newer version
                    //DepositApproveCheck/UserTransactionID/:UserTransactionID/
                    console.log("Approved Deposit Notify check : "+ConnectionMode.getMainAddressByProductionMode()+'/DepositApproveCheck/UserTransactionID/'+DepositUUID);

                    request(ConnectionMode.getMainAddressByProductionMode()+'/DepositApproveCheck/UserTransactionID/'+DepositUUID, function (error, response, result) {
                      let Object = JSON.parse(response.body);

                      console.log("Amount Be updated : "+Object.Amount);
                      client.Money = (parseInt(client.Money)+parseInt(Object.Amount));//we update the player
                    });

                  }else{
                    console.log("UUID EMpty");
                  }
                 // console.log("Amount Deposit Approved "+Object.DepositUUID);
                 // console.log(Object.DepositNotice);

            }
          }
        });
      }


      /*player related */
       
      else if (Object.Type == "NotifyPlayerDepositReceived") {
        console.log("NotifyPlayerDeposit");
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            if (client.UserAccountID == Object.UserAccountID) {
                  client.DepositNotice = ""; 
                  InvokeRepeat();//force update list right away
                 // console.log(Object.DepositNotice);

            }
          }
        });
      }
      
      else if (Object.Type == "NotifyPlayerTrasferReceived") {
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            if (client.UserAccountID == Object.UserAccountID) {
                  client.TransferNotice = ""; //clear when player confirms transfer
                  InvokeRepeat();//force update list right away
                 // console.log(Object.DepositNotice);

            }
          }
        });
      }
      else if (Object.Type == "Transfer") { //event trasfer room
        console.log("Transfered Money "+ Object.TransferAmount/*JSON.stringify(Object,null,2)*/);
        //console.log("LeaveRoom "+ Object.RoomID);
        //self update money deduct 
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            if (client.UserAccountID == Object.UserAccountID) {
                  console.log("UserAccountID Sender : "+client.UserAccountID+ " Matched "+Object.UserAccountID);
                  client.Money = parseInt(client.Money) - parseInt(Object.TransferAmount); //add back the money to the player
            }
          }
        });
        //Target Update add Money Reciver Money
        // slightly diffrent from above due to the reqirment of userName instead of UserAccountID
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            if (client.UserName == Object.Target) {//target userName
                
                  client.Money = parseInt(client.Money) + parseInt(Object.TransferAmount); //add  the money to the player
                  client.TransferNotice ="Recieved Money  "+Object.TransferAmount;//the notification to the player
                  console.log("UserName Reciver : "+client.UserName+ " Matched "+Object.Target +" client.Money "+client.Money);
                  
            }
          }
        });
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            let ParentUserAccountIDList = ws.ParentUserAccountIDList.split(",");

            for(let i=0;i<ParentUserAccountIDList.length;++i){
              if(ParentUserAccountIDList[i]==client.UserAccountID){
                console.log("Transfer Parent To Notify "+client.UserAccountID);
                client.send(stringify({
                  Response: "PlayerTransfer",
                  UserAccountID : ws.UserAccountID
                }, null, 0));
              }
            }
          }
        });
      }
      else if (Object.Type == "Withdraw") { //event withdraw room
        //console.log("LeaveRoom "+ Object.RoomID);
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            if (client.UserAccountID == Object.UserAccountID) {
                  client.Money = parseInt(client.Money) - parseInt(Object.WithdrawAmount); //add back the money to the player
            }
          }
        });
        //to admin
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            let ParentUserAccountIDList = ws.ParentUserAccountIDList.split(",");
            for(let i=0;i<ParentUserAccountIDList.length;++i){
              if(ParentUserAccountIDList[i]==client.UserAccountID){
                console.log("Withdraw Parent To Notify "+client.UserAccountID);
                client.send(stringify({
                  Response: "Withdraw",
                  UserAccountID : ws.UserAccountID
                }, null, 0));
              }
            }
          }
        });
      }

      else if (Object.Type == "RoomChanged") { //event  room
        //console.log("LeaveRoom "+ Object.RoomID);
        /*room player count */
        let RoomNames=[];
        if(ws.Rooms!=undefined&&ws.Rooms.length>0){
          for(let i=0;i<ws.Rooms.length;++i){
         //   console.log("Room "+ws.Rooms[i].RoomID);
            RoomNames.push(ws.Rooms[i].RoomID);
          }
        }

        /*lobby same account count */
          var countSameAccountInLobby=0;
          wss.clients.forEach((client) => {
            if (client.readyState == 1) {
              if (client.UserAccountID == Object.UserAccountID) {
                if(client.isLobby==true){
                  countSameAccountInLobby++;
           
                }
              }
            }
          });
          if(countSameAccountInLobby>0){//just put one when we find one player in lobby
            RoomNames.push("Lobby");
          }
        //new
          ///PlayerRooms/Rooms/:RoomNames/UserAccountID/:UserAccountID/
          request(ConnectionMode.getMainAddressByProductionMode()+'/PlayerRooms/Rooms/'+RoomNames+'/UserAccountID/'+UserAccountID, function (error, response, result) {

          });
          
      }
      else if (Object.Type == "LeaveRoom") { //event leave room
        ws.isLobby=true;
        //console.log("LeaveRoom "+ Object.RoomID);
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            if (client.UserAccountID == Object.UserAccountID) {
              
              if(client.Rooms!=undefined){
                var filtered = client.Rooms.filter(function (value) { //the oldest user account with the roomID // the oldest is basically the first item we find from 0 to N.. 
                  return value.RoomID == Object.RoomID;
                });
                if (filtered.length > 0) {
                  if (filtered[0].BuyIn != undefined) { // LeaveRoom the oldest is basically the first item we find from 0 to N.. 
                    client.Money = parseInt(client.Money) + parseInt(filtered[0].BuyIn); //add back the money to the player
                    
                    var NewArrayfiltered = client.Rooms.filter(function (value) {
                      return value.RoomID !== Object.RoomID;
                    });
                    client.Rooms = NewArrayfiltered;
                  }
                } else {
                  console.log("LeaveRoom but and last Player");
                }
              }
            }
          }
        });
        RedisConnect.SetMoneyAtRoom(ws.UserAccountID,Object.RoomID,0);//set the recent buyIn Money of all rooms of a specific userAccount from LeadAccount
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            let ParentUserAccountIDList = ws.ParentUserAccountIDList.split(",");
            for(let i=0;i<ParentUserAccountIDList.length;++i){
              if(ParentUserAccountIDList[i]==client.UserAccountID){
                console.log("LeaveRoom Parent To Notify "+client.UserAccountID);
                client.send(stringify({
                  Response: "LeaveRoom",
                  UserAccountID : ws.UserAccountID
                }, null, 0));
              }
            }
          }
        });
      }

      else if (Object.Type == "ComputedBet") {
        console.log("ComputedBet "+parseInt(Object.BetAmount));
        console.log("Commission "+ws.PlayerCommission);
        let result = GlobalFunctions.ComputeRakePlayer(parseInt(Object.BetAmount),parseFloat( ws.PlayerCommission)).playerRake;
        let ConvertedBet = (parseInt(Object.BetAmount)-result);
        console.log("ConvertedBet :" +ConvertedBet);
        ws.send(stringify({
          Response: "ConvertedBet",
          ConvertedBet:ConvertedBet,
        }, null, 0));
      }
     
      else if (Object.Type == "Bet") { //bet event occured 
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            if (client.UserAccountID == Object.UserAccountID&&client.isLeadSocket==true) { //we sync all same account bet value only updates one lead must exist in all instances
              console.log("Socket Bet");
              
              for (var i = 0; i < client.Rooms.length; ++i) {
                if (client.Rooms[i].RoomID == Object.RoomID) {
                  if (parseInt(client.Rooms[i].BuyIn) - parseInt(Object.BetAmount) >= 0) {
                    client.Rooms[i].BuyIn = parseInt(client.Rooms[i].BuyIn) - parseInt(Object.BetAmount);

                    RedisConnect.SetMoneyAtRoom(ws.UserAccountID,client.Rooms[i].RoomID,client.Rooms[i].BuyIn);//set the recent buyIn Money of all rooms of a specific userAccount from LeadAccount

                   /* ws.send(stringify({
                      Response: "Something"
                    }, null, 0));*/

                    var NewRooms = client.Rooms;// lead room

                    wss.clients.forEach((client2) => {
                      if(client2.UserAccountID==ws.UserAccountID){
                       
                        client2.Rooms = NewRooms;//copy lead to children
                      }
                    });

                  } else {
                    ws.send(stringify({
                      Response: "NotEnoughMoney"
                    }, null, 0)); //pops up only to the local player trying to bet
                    //target.send();
                    console.log("Tried to bet with no money");
                  }
                }
              }
            }
          }
        });
        
        //to admin
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            let ParentUserAccountIDList = ws.ParentUserAccountIDList.split(",");
            for(let i=0;i<ParentUserAccountIDList.length;++i){
              if(ParentUserAccountIDList[i]==client.UserAccountID){
                console.log("Bet Parent To Notify "+client.UserAccountID);
                client.send(stringify({
                  Response: "PlayerBet",
                  UserAccountID : ws.UserAccountID
                }, null, 0));
              }
            }
          }
        });

     

      } else if (Object.Type == "Win") { //Win event occured 
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            if (client.UserAccountID == Object.UserAccountID&&client.isLeadSocket==true) { //we sync all same account win value only updates one lead must exist in all instances
              console.log("Socket Won");
              for (var i = 0; i < client.Rooms.length; ++i) {
                if (client.Rooms[i].RoomID == Object.RoomID) {
                  if (parseInt(client.Rooms[i].BuyIn) + parseInt(Object.WinAmount) >= 0) {
                    client.Rooms[i].BuyIn = parseInt(client.Rooms[i].BuyIn) + parseInt(Object.WinAmount);
                    
                  }
                }
              }
              var NewRooms = client.Rooms;//the lead room
              wss.clients.forEach((client2) => {
                if(client2.UserAccountID==ws.UserAccountID){
                  client2.Rooms = NewRooms;//copy lead to children
                }
              });
              console.log("Winz");
            }

            if(client.UserAccountID==ws.UserAccountID){//only add to te same Account but diffrent instances
              client.WinPoints++;//add Win Points to All Same Player no need to filter lead
            }
          }
        });
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            let ParentUserAccountIDList = ws.ParentUserAccountIDList.split(",");
            for(let i=0;i<ParentUserAccountIDList.length;++i){
              if(ParentUserAccountIDList[i]==client.UserAccountID){
                console.log("Win Parent To Notify "+client.UserAccountID);
                client.send(stringify({
                  Response: "Win",
                  UserAccountID : ws.UserAccountID
                }, null, 0));
              }
            }
          }
        });
      } else if (Object.Type == "BuyIn") { //identify object type
       
        ClientBuyIn(ws, Object,false);// false because its a normal buyin

        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            let ParentUserAccountIDList = ws.ParentUserAccountIDList.split(",");
            for(let i=0;i<ParentUserAccountIDList.length;++i){
              if(ParentUserAccountIDList[i]==client.UserAccountID){
                console.log("BuyIn Parent To Notify "+client.UserAccountID);
                client.send(stringify({
                  Response: "BuyIn",
                  UserAccountID : ws.UserAccountID
                }, null, 0));
              }
            }
          }
        });
      }
      else if (Object.Type == "Kick") {
       
        //need to verify if the kicker is an admin
        wss.clients.forEach((client) => {
          if (client.readyState == 1) {
            if (client.UserAccountID == Object.TargetUserAccountID) {
              console.log("Kick Player : "+Object.TargetUserAccountID);//will pop multiple times if we have instances of same account
              let ToSend = stringify({
                Type: "Kick",
                UserAccountID :  Object.TargetUserAccountID
              }, null, 0);
              client.send(ToSend);
            }
          }
        });
      }
      else if(Object.Type == "RequestRecovery"){
      
  
        // we might need a dedicated recovery apprch method for room disconnection
        // instead of ClientBuyIn we need to store in database only to the socketInstanceID instead of UserAccountID aswell
        //console.log(Object);
        RedisConnect.GetMoneyAtRoom(Object.UserAccountID,Object.RoomID,function(res){
            console.log("Result : "+res);
             
              ClientBuyIn(ws, Object,true);// true because its a recovery
              
        });
      }
      else if(Object.Type == "SendMessage"){
       // console.log("Attempt Recovery not implemented");
  
        // we might need a dedicated recovery apprch method for room disconnection
        // instead of ClientBuyIn we need to store in database only to the socketInstanceID instead of UserAccountID aswell
        //console.log(Object);
       /* RedisConnect.GetMoneyAtRoom(Object.UserAccountID,Object.RoomID,function(res){
            console.log("Result : "+res);
             
              ClientBuyIn(ws, Object,true);// true because its a recovery
              
        });*/

      }
    }
 
    
    else {
      //possibly a diffrent message type
      console.log("some message : " + event.data);
    }

  }

  ws.onerror = function (event) {

    console.debug("WebSocket Error message received:", event);
  };
  ws.onclose = function (event) {
    let DisconnectedUserAccountID= event.target.UserAccountID;
    let DisconnectedInstanceID = event.target.InstanceID;

  

    //console.log("isLeadSocket Left "+event.target.isLeadSocket);

   


    if(event.target.isLeadSocket==true){//when Lead leaves

      console.log("--------Sudden Disconnected Lead--------");

    //  console.log("Lead Leave Total clients "+ wss.clients.size);
      if(wss.clients.size>0){//should always execute as  long as their are players
          console.log("Lead Leave with more than 1 client");
          let array = Array.from(wss.clients);
         // console.log("Array Rooms "+JSON.stringify(Jsoncycle.decycle(array),null,2));
         if(array.length!=undefined&&array.length>0){
          let LeadRooms =array[0].Rooms;// first index
          
          // console.log("Room :" +JSON.stringify(Jsoncycle.decycle(array[1].Rooms),null,2));

          //-------start new rooms asignment
            let NewLeadRooms =[];
            let NewLeadInstanceID = array[0].InstanceID;
            let OldBuyInOfOldLead =0;
            for(let i =0;i<LeadRooms.length;++i){
              if(DisconnectedInstanceID!=LeadRooms[i].InstanceID){
                NewLeadRooms.push(LeadRooms[i]);
              }
              else if(DisconnectedInstanceID==LeadRooms[i].InstanceID){
                console.log("Disconnected Money "+LeadRooms[i].BuyIn);
                OldBuyInOfOldLead = LeadRooms[i].BuyIn;
              }
            }
            console.log("OldBuyInOfOldLead "+OldBuyInOfOldLead);
           wss.clients.forEach((client) => {//add back the money
              if (client.readyState == 1) {
                  client.Money=client.Money+OldBuyInOfOldLead;
              }});


          //  console.log("Room :" +JSON.stringify(Jsoncycle.decycle(NewLeadRooms),null,2));
          //  wss.clients[0].isLeadSocket=true;//set as new lead
            console.log("New Lead Instance ID : "+NewLeadInstanceID);
            wss.clients.forEach((client) => {
              if (client.readyState == 1) {

                client.Rooms = NewLeadRooms;
                if(client.InstanceID==NewLeadInstanceID){
                  client.isLeadSocket=true;
                }
              }});
              //-------end new rooms asignment
         }else{
           console.log("No Rooms to migrate Safe because no same account is playing");
         }
      }else{
        console.log("Sudden Disconnected Client last player and also lead");
      }
    }else{
      console.log("----------Sudden Disconnected Non Lead------------");
      wss.clients.forEach((client) => {
        if(client.isLeadSocket==true){//we get the lead account it must exist 
          var rooms = client.Rooms;
          if(rooms!=undefined){
            for(let i =0;i<rooms.length;++i){
              if(rooms[i].InstanceID==DisconnectedInstanceID){
                client.Money = (client.Money)+ (rooms[i].BuyIn);
               // console.log((DisconnectedInstanceID)+"  Instance Exit with room " + (stringify(client.Rooms,null,0)));
              }
            }
          }
        }
      })

      //clearance check
   
    }



    wss.clients.forEach((client) => {
      if (client.readyState == 1) {
        if (client.UserAccountID == Object.UserAccountID) {
          if(client.Rooms!=undefined){
            var filtered = client.Rooms.filter(function (value) { //the oldest user account with the roomID // the oldest is basically the first item we find from 0 to N.. 
              return value.RoomID == Object.RoomID;
            });
            if (filtered[0].BuyIn != undefined) { //Onclose the oldest is basically the first item we find from 0 to N.. 
              client.Money = parseInt(client.Money) + parseInt(filtered[0].BuyIn); //add back the money to the player
  
              var NewArrayfiltered = client.Rooms.filter(function (value) {
                return value.RoomID !== Object.RoomID;
              });
  
              client.Rooms = NewArrayfiltered;
            }
          }
        }
      }
    });
    
    let CountSameAccount =0;
    wss.clients.forEach((client) => {
      if (client.readyState == 1) {
        if (client.UserAccountID == DisconnectedUserAccountID) {
          CountSameAccount++;
        }
      }
    });

    if(CountSameAccount==0){
      console.log("Last Instance Of : "+DisconnectedUserAccountID +" Disconnected");
      request(ConnectionMode.getMainAddressByProductionMode()+'/Connection/Status/Offline/UserAccountID/'+UserAccountID, function (error, response, result) {

      });

     /* var query2 = "UPDATE `sampledb`.`useraccounts` SET `OnlineStatus` = 'Offline' WHERE (`UserAccountID` = \'"+UserAccountID+"\');";
      function UpdateStatus(){
        DBConnect.DBConnect(query2, function (response) {
          if (response != undefined) {
          }
        });
      }
      UpdateStatus();*/

    }



   // console.log(JSON.stringify(jc.decycle(event.target.UserAccountID)));

    ConnectedUsers--;
    DeadInstanceIDCleanUp();//call clean up and update clients right away after a disconnect occurs
  //  console.log('Client disconnected ' + ConnectedUsers+" UserAccount That Disconnected : "+event.target.UserAccountID);
  };
});

//websocket constant InvokeRepeat
setInterval(() => {
  InvokeRepeat();
}, 500);

//IgnoreMainMoneyModification is used to ignore changes from main money
// it can be used as a recovery approch during a room socket disconnection but not a network socket disconnection
//IgnoreMainMoneyModification - false because its a normal buyin if its for recovery 
function ClientBuyIn(ws, Object,IgnoreMainMoneyModification) {
  ws.isLobby = false;
  var BuyInRoom = Object;
  //console.log(BuyInRoom);
 
  
  wss.clients.forEach((client) => {
    
    //existing buyin
    if (client.UserAccountID == Object.UserAccountID && client.isLeadSocket == true) { //the lead role must always be passed when it leaves if not this code wont execute
      //  console.log("Buyin Money "+ Object.BuyIn);
      if (client.Rooms == undefined) { //when empty must inisialize only then the one bellow it can push
        client.Rooms = [];
      }
      if (client.Rooms.length == 0) { //when no child or parent in room same account instances
        client.Rooms.push({
          RoomID: Object.RoomID,
          BuyIn: Object.BuyIn,
          InstanceID: ws.InstanceID
        });
        //console.log(client.Rooms);
        if(IgnoreMainMoneyModification==true){       
             //do nothing to the main money

        }else{
          client.Money = parseInt(client.Money) - parseInt(Object.BuyIn);//deducting Money
        }
      
      }
      else {
        // new buyin update or insert
        if (client.Money - Object.BuyIn >= 0) { //the top must be an isleadScoket
          var NotFound = true;
          var NewRooms = []; //the new rooms from is lead above
          for (var i = 0; i < client.Rooms.length; ++i) { //updates the lead accout
            if (client.Rooms[i].RoomID == Object.RoomID && client.UserAccountID == ws.UserAccountID) { //Match Found Update Instead
              console.log("Match Found Update Instead");
              if(IgnoreMainMoneyModification==true){
                //do nothing to the main money
              }else{
                client.Money = (parseInt(client.Money) - parseInt(Object.BuyIn));//deducting Money
              }
           

              client.Rooms[i].BuyIn = (parseInt(client.Rooms[i].BuyIn) + parseInt(Object.BuyIn));
              
              RedisConnect.SetMoneyAtRoom(Object.UserAccountID,client.Rooms[i].RoomID, client.Rooms[i].BuyIn);//set the recent buyIn Money of all rooms of a specific userAccount from LeadAccount
          
              //console.log(client.Rooms[i].BuyIn + Object.BuyIn);
              NotFound = false;
              // break;
            }
          }
         
          NewRooms = client.Rooms; //pass the new value to childrens
          wss.clients.forEach((client) => {
            if (client.UserAccountID == ws.UserAccountID) {
              client.Rooms = NewRooms;
            }
          });
          if (NotFound == true) { // nothing found so we add it instead
            client.Rooms.push({
              RoomID: Object.RoomID,
              BuyIn: Object.BuyIn,
              InstanceID: ws.InstanceID
            });
            //console.log(client.Rooms);
            if(IgnoreMainMoneyModification==true){
                        //do nothing to the main money
            }else{
              client.Money = parseInt(client.Money) - parseInt(Object.BuyIn);//deducting Money
            }
           
          }
        }
        else {
          console.log("Not Enough Money");
        }
      }
    }
   
             
  });
  console.log("Buyin : " + BuyInRoom);
  wss.clients.forEach((client) => {
    if (client.readyState == 1) {
      for (let i = 0; i < ws.ParentUserAccountIDList.length; ++i) {
        if (ws.ParentUserAccountIDList.includes(client.UserAccountID)) {
          console.log("Parent To Notify " + client.UserAccountID);
          client.send(stringify({
            Response: "PlayerBuyIn"
          }, null, 0));
        }
      }
    }
  });
}

function DeadInstanceIDCleanUp(){//accessed by a InvokeRepeat aswell
    //dead InstanceID clean Up which accessed by the onError of websocket
    wss.clients.forEach((client) => {

      let UserAccountID = client.UserAccountID;
  
      if(client.isLeadSocket==true){
        let InstanceID = client.InstanceID;//Lead InstanceID
   
      //  console.log("Lead InstanceID "+InstanceID);
        let LeadRooms = client.Rooms;//we get the oldest instanceid it is also likely tag as isLeadSocket
        
        var NewRooms = [];
   
        wss.clients.forEach((client2) => {
          
          let ChildInstanceID = client2.InstanceID;
          if(LeadRooms!=undefined){
            //this filters out dead InstanceID Across Active InstanceID 
            for(let i =0;i<LeadRooms.length;++i){
              if(ChildInstanceID == LeadRooms[i].InstanceID){
              
                NewRooms.push(LeadRooms[i]);
              }
  
            }
          }
        });
        var DeadInstanceAtRoom=[];
        if(LeadRooms!=undefined){
          for(let i2=0;i2<LeadRooms.length;++i2){
            let found =false;
            for(let j=0;j<NewRooms.length;++j){
              if(NewRooms[j].InstanceID==LeadRooms[i2].InstanceID){
                found=true;
                break;
              }
            }
            DeadInstanceAtRoom.push(LeadRooms[i2]);
          }
        }
  
        
        //copy new Rooms Instances
        wss.clients.forEach((client3) => {
          if(client3.UserAccountID==UserAccountID){
            client3.Rooms = NewRooms;
          }
        });
       // console.log("Expected new List  from lead " + stringify(NewRooms,null,0));
        if(DeadInstanceAtRoom.length>0){
       //   console.log("DeadInstanceAtRoom  from lead " + stringify(DeadInstanceAtRoom,null,0));
        }
    
      }
    });
}
function InvokeRepeat(){//this is also accessed by OnError of websocket just in case
 

  DeadInstanceIDCleanUp();


  let array = Array.from(wss.clients);
  var distinctlist = Enumerable.from(array);

  wss.clients.forEach((client) => {

    client.Money = parseInt(LatestAndUnique(distinctlist, client.UserAccountID).Money);
    // console.log("UserAccountID "+client.UserAccountID+" "+client.Money);
  });
  wss.clients.forEach((client) => {
    if (client.readyState == 1) {
      var count = 0;
      wss.clients.forEach((client2) => {
        if (client2.UserAccountID == client.UserAccountID) {
          count++;
        }
      });
      const ResponseData = {
        UserAccountID: client.UserAccountID,
        DepositNotice: client.DepositNotice,
        TransferNotice: client.TransferNotice,
        Money: client.Money,
        Rooms: client.Rooms,
        CountSameAccount: count,
        InstanceID: client.InstanceID,
        isLeadSocket: client.isLeadSocket,
        WinPoints:client.WinPoints
      };
      let result = stringify(ResponseData, null, 0);

      totalSocketBytes+=sizeof(result);
      client.send(result);
    }
    // console.log("UserAccountID "+client.UserAccountID+" "+client.Money);
  });

  //same as above but for a debuging All UserAccountID 
 /* not needed here we should have a socket dedicated for admin and debugging
  wss.clients.forEach((client) => {

    if (client.readyState == 1&&client.UserAccountID=="Debug") {
      var count = 0;
      wss.clients.forEach((client2) => {
        if (client2.UserAccountID == client.UserAccountID) {
          count++;
        }
      });
      let ResponseArray =[];
      
      wss.clients.forEach((client) => {
        const ResponseData = {
          UserAccountID: client.UserAccountID,
          DepositNotice: client.DepositNotice,
          TransferNotice: client.TransferNotice,
          Money: client.Money,
          Rooms: client.Rooms,
          CountSameAccount: count,
          InstanceID: client.InstanceID,
          isLeadSocket: client.isLeadSocket,
          WinPoints:client.WinPoints
        };
      //  let result = stringify(ResponseData, null, 0);
      ResponseArray.push(ResponseData);
      });

      totalSocketBytes+=sizeof(ResponseArray);
      if(ResponseArray.length>1){
        let result = stringify(ResponseArray, null, 0);
        client.send(result);
      }
    
    }
    // console.log("UserAccountID "+client.UserAccountID+" "+client.Money);
  });*/
  // console.log(array.length);

  /*wss.clients.forEach((client) => {
      if(client.readyState==1){
     
        client.send(stringify({
          UserAccountID:client.UserAccountID,
          Money:client.Money
        },null,0));
      }
  });*/
}

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}


//Test Connection Important here to check if information provided is correct
//require('./API/SharedController/DBConnect').DBConnectTest();


// listen (start app with node server.js) ======================================
//server.listen(port, ip);// no loger needed

/*console.log('Server running on http://%s:%s', ip, port);
console.log("--------process informationz  for openshift---------");
console.log(beautify(process.env, null, 2, 100));
console.log("-----------------");
console.log("MysqlHost :"+process.env.MYSQL_SERVICE_HOST || 'localhost'); //output the service if service host is undefined
console.log("Mysql Port :"+process.env.MYSQL_SERVICE_PORT || 3306);

console.log("MariaHost :"+process.env.MARIADB_SERVICE_HOST || 'localhost'); //output the service if service host is undefined
console.log("MariaDB Port :"+process.env.MARIADB_SERVICE_PORT || 3306);


console.log("Redis :"+process.env.REDIS_PORT_6379_TCP_ADDR);
console.log("Redis Port :"+process.env.REDIS_PORT_6379_TCP_PORT);*/

var requestStats = require('request-stats');

//console.log(beautify(process.env, null, 2, 100));

const pretty = require('prettysize');
var stats = requestStats(server);
var AllHttpBytes = 0;

stats.on('complete', function (details) {
  var size = details.req.bytes;
  AllHttpBytes+=size;
  console.log("Total Size of Each HTTP : " +pretty(AllHttpBytes)+ " Total Socket Size : " +pretty(totalSocketBytes));
});

let blocked = require('blocked');
blocked((time, stack) => {
  if(stack!=undefined){
    console.log(`Blocked for ${time}ms, operation started here:`, stack)
  }
 
},{threshold:4, trimFalsePositives:true});

/*
var stats = requestStats(app);

stats.on('complete', function (details) {
  var size = details.req.bytes;
  console.log(size);
});
stats.on('request', function (req) {
  // evey second, print stats
  var interval = setInterval(function () {
    var progress = req.progress()
    console.log(progress)
    if (progress.completed) clearInterval(interval)
  }, 1000)
})*/

/*this catches everything and prevent node application from compleatly shutting down */
process.on('uncaughtException', function (err) {


  console.log("Catch everything: "+err);

  if(ServerMode=="Debug"){
  /*send the error to the connected clients not needed in Server Production Mode*/
  wss.clients.forEach((client) => {
    if (client.readyState == 1) {
      var count = 0;
      wss.clients.forEach((client2) => {
        if (client2.UserAccountID == client.UserAccountID) {
          count++;
        }
      });
      const ResponseData = {
        ServerError:err,
      };
      let result = stringify(ResponseData, null, 0);
      totalSocketBytes+=sizeof(result);
      client.send(result);
    }
    // console.log("UserAccountID "+client.UserAccountID+" "+client.Money);
  });
  }
});


//to show all routes 
/*
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(r.route.path)
  }
})*/
module.exports = routes;
module.exports = app;