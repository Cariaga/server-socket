const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'user',
    port: 5432,
  })

module.exports.PGConnect = function PGConnect(query,callback){
    (async () => {
       // console.log('starting async query');
      //  console.log('starting callback query');
        pool.query(query, (err, res) => {
          console.log('callback query finished');
          if(err){
            console.log('PG Connect Error :'+err);
            callback(undefined);
          }else{
            callback(res);
          }
         

        })
      
      //  console.log('calling end');
        await pool.end();
        //console.log('pool has drained');
      })()
}
module.exports.PGConnectTest = function PGConnectTest(){
    (async () => {
       // console.log('starting async query');
       // console.log('starting callback query');
        pool.query("select Now()", (err, res) => {
          console.log('callback query finished');
          
          if(err){
            console.log('PG Connect Error :'+err);
          
          }else{
            console.log('PG test :'+res);
          }
         

        })
      
      //  console.log('calling end');
        await pool.end();
      //  console.log('pool has drained');
      })()
}