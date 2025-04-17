let app = require('./app');
let db = require('./database/database');


async function main(){
    try{
    await app.listen(3500);
    console.log('Server on port 3500');}
    catch(err){
        console.log(err);
    }
};
main();

/*
 db.sync()
     .then( () => {
         app.listen(3500, () => {
             console.log('Server started on http://localhost:3500/')
         })
     })
     .catch(err => {
         console.log(err);
     })
*/