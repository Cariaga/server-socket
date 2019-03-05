//this is the route of the main server not its self
let Remote = "https://tester-holdem-server.4b63.pro-ap-southeast-2.openshiftapps.com";
let localhost = "http://localhost:8080";

module.exports.getMainAddressByProductionMode = function () {
    if(process.env.NODE_ENV=="production"){
        return Remote;
    }else{
        return localhost;
    }
}
module.exports.getPortByProductionMode = function () {
    if(process.env.NODE_ENV=="production"){
        return 8080;
    }else{
        return 3000;
    }
}