var redis = require("redis"),
    client = redis.createClient({ host: process.env.REDIS_PORT_6379_TCP_ADDR,password:"eastcoast"});
 
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
 
//important redis dosn't allow undefined so we delcare as empty or valued
client.set("string key",isProduction, redis.print);
client.get("string key", function(err, reply) {
  // reply is null when the key is missing
  console.log("Redis result :" + reply);
  client.quit();
});
