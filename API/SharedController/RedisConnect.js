// redis dosn't support nested keys

var redis = require("redis"),
    client = redis.createClient({ host: process.env.REDIS_PORT_6379_TCP_ADDR,password:"eastcoast" });
 
// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });
 
client.on("error", function (err) {
    console.log("Error " + err);
});

 var isProduction="";
 if( process.env.NODE_ENV=="production"){
  isProduction="production";
 }else{
   isProduction="";
 }
 client.on("connect", function () {
   console.log("Redis is connected");
});
//important redis dosn't allow undefined so we delcare as empty or valued
//its better to point to the UserAccountID because the instanceID might have been refreshed at this point
module.exports.SetMoneyAtRoom = function SetMoneyAtRoom(UserAccountID,RoomName,Value){
 console.log("SetMoneyAtRoom " + UserAccountID +" "+RoomName +" "+Value );
  
    //first val
    let Key ="UserAccount_"+UserAccountID+"RoomName_"+RoomName;//must use underscore because it becomes nested in redis
    console.log("Redis Part");
    client.set(Key,Value,function(err,res){
      if(err==null||err==undefined){
        console.log("Redis Call : "+res + " From Request Key : ("+Key+")");
      }else{
        console.log("Redis  Error : "+err + " From Request Key : ("+Key+")");
      }
      
    });
    //let ExpireSeconds = 1000;
    //client.expire(Key, ExpireSeconds);
   // client.get(Key, redis.print);
   

}
//its better to point to the UserAccountID because the instanceID might have been refreshed at this point
module.exports.GetMoneyAtRoom = function GetMoneyAtRoom(UserAccountID,RoomName,callback){

 
    //first val
    let Key ="UserAccount_"+UserAccountID+"RoomName_"+RoomName;//must use underscore because it becomes nested in redis
    console.log("Somthing GetMoneyAtRoom : "+Key);
    client.get(Key, function(err,res){
      callback(res);
    });
 
}

