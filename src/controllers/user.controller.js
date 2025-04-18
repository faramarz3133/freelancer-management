let Sequelize = require('sequelize');
let User = require('../models/User');
let Skill = require('../models/Skill');
let Category = require('../models/Category');
let Userprofile = require('../models/Userprofile');
let bcrypt = require('bcryptjs');
let {createJwtEmail,createJwt,verifyJwtEmail} = require('../util/jwt');
let nodemailer = require('nodemailer');
let sendgridTransport = require('nodemailer-sendgrid-transport');
require('dotenv').config();

let transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key:process.env.SENDGRID_API_KEY
    }
}));

async function createUser(req, res) {
    let {email,username,isclient,password} = req.body;
    if(!username) {
        res.send('نام کاربری را وارد کنید');
    }
    if(!email) {
        res.send('ایمیل خود را وارد کنید');
    }
    if(!password) {
        res.send('رمز عبور خود را وارد کنید');
    }
    let hashedpass = await bcrypt.hash(password, 12);
    try{
        let newUser =  await User.create({
          email,
          username,
          isclient,
          password : hashedpass
        },{
         fields : ['email','username','isclient','password']
     });
    if(newUser){
        if(newUser.isclient === true){
            Userprofile.create({
                address: req.body.address,
                education: req.body.education,
                rewards: req.body.rewards,
                birthday: req.body.birthday,
                gender: req.body.gender,
                clientId : newUser.id
            })
        }
        else if(newUser.isclient === false){
            Userprofile.create({
                address: req.body.address,
                education: req.body.education,
                rewards: req.body.rewards,
                birthday: req.body.birthday,
                gender: req.body.gender,
                freelancerId : newUser.id
            })
        }
        let createdUser = await User.findOne({
            attributes: ['email','username','id','image'],
            where: {
            username: newUser.username
            }
            });
         const emailtoken = await createJwtEmail(createdUser.get());
         const url = `http://localhost:3500/api/user/confirmation/${emailtoken}`;
         await transporter.sendMail({
             to: createdUser.email,
             from: 'freelancerIran@node.com',
             subject: 'FreelancerIran Signup succeeded!',
             html: `
             <h1>Please verify your account!</h1>
             <button><a href="${url}">click to confirm</button>
             `
         });

        res.json({...createdUser.get()})
        }
} catch(e){
    console.log(e);
    res.status(500).json({
        message: 'Something goes wrong',
        data: {}
    });
}
}

function confirmingEmail(req,res) {
    
    verifyJwtEmail(req.params.token)
        .then(user => {
            return User.update({confirmed : true},{where:{id : user.id}})
        })
        .catch(err => console.log(err))
}

function updateUser(req,res) {
    let {image,firstname,lastname,jobtitle,username,email,isclient} = req.body;
    User.findOne({where: {id:req.user.id}}).then(user=>{
            User.update({image:image,firstname:firstname,isclient:isclient,email:email,username:username,lastname:lastname,jobtitle:jobtitle},{where:{id: req.user.id}})
        .then(()=>{
            return User.findByPk(req.user.id); 
        })
        .then(user =>{
            if((!user.isclient)){
                for(let skilll of req.body.skills){
                    Skill.findOne({where:{name:skilll.name}})
                    .then(skil => {
                        return user.addSkill(skil)
                    })
                    .catch(err => console.log(err));
                }
            }
            return res.send(user);
        })
        .catch(err => {console.log(err);})
        })
}

function loginUser(req,res) {
    console.log(req.body.password);
    if(!req.body.password){
        res.send("Did not supply password");
    }
    if(!req.body.email){
        res.send("Did not supply email");
    }
    User.findOne({
        where: { email: req.body.email}})
    .then(us => {
        if(us){
             if(us.confirmed===false){
                 res.send('please confirm your email')
             }
            else{
                bcrypt.compare(req.body.password,us.password)
                .then(bol => {
                    if(bol){
                        async function a(){
                            let prof2 = await Userprofile.findOne({where:{clientId : us.id}});
                            let prof1 = await Userprofile.findOne({where:{freelancerId : us.id}});
                            let token = await createJwt(us.get());
                            let userskills = await Skill.findAll({
                                include:[{
                                    model:User,
                                    as:'Workers',
                                    where:{
                                        id:us.id
                                    },
                                    attributes:[],
                                    }],
                                });

                            if(us.isclient){
                                let prof = prof2;
                                let userJson = {...us.get(),token,prof,userskills};
                                delete userJson.password;
                                res.json(userJson);}
                            else if(!us.isclient){
                                let prof = prof1;
                                let userJson = {...us.get(),token,prof,userskills};
                                delete userJson.password;
                                res.json(userJson);}
                            }
                            a();
                    }
                    else{
                    res.send("wrong pass")
                    }
                })
                .catch(err => res.send(err))
            }
        }
        else{
            res.send("Not exist such user with this email");
        }
    })
}

async function getUser(req,res){
    User.findOne({
        where: { id: req.user.id}
    })
    .then(us => {
        if(us){
            async function a(){
                let prof2 = await Userprofile.findOne({where:{clientId : us.id}});
                let prof1 = await Userprofile.findOne({where:{freelancerId : us.id}});
                let userskills = await Skill.findAll({
                include:[{
                        model:User,
                        as:'Workers',
                        where:{
                            id:us.id
                            },
                            attributes:[],
                            }],
                        });
                if(us.isclient){
                    let prof = prof2;
                    let userJson = {...us.get(),prof,userskills};
                    delete userJson.password;
                    res.json(userJson);}
                else if(!us.isclient){
                    let prof = prof1;
                    let userJson = {...us.get(),prof,userskills};
                    delete userJson.password;
                    res.json(userJson);}}
                    a();
        }
    })
}

async function getUserWithId(req,res){
    User.findOne({
        where: { id: req.body.id}
    })
    .then(us => {
        if(us){
            async function a(){
                let prof2 = await Userprofile.findOne({where:{clientId : us.id}});
                let prof1 = await Userprofile.findOne({where:{freelancerId : us.id}});
                let userskills = await Skill.findAll({
                include:[{
                        model:User,
                        as:'Workers',
                        where:{
                            id:us.id
                            },
                            attributes:[],
                            }],
                        });
                if(us.isclient){
                    let prof = prof2;
                    let userJson = {...us.get(),prof,userskills};
                    delete userJson.password;
                    res.json(userJson);}
                else if(!us.isclient){
                    let prof = prof1;
                    let userJson = {...us.get(),prof,userskills};
                    delete userJson.password;
                    res.json(userJson);}}
                    a();
        }
    })
}

function freelancers(req,res) {
    User.findAll({
        include:[{
            model:Userprofile,
            as:'freelancer_profile'
        }],
        where:{isclient:false}
    })
        .then(us => res.send(us))
        .catch(err => console.log(err))
}

function freelancerWithSpecSkil(req,res) {
    try{
        const Op = Sequelize.Op;
        let a=[];
        req.body.s.forEach(skill=>{
            a.push(skill.name)
        });
        User.findAll({
            include:[{
                model:Skill,
                as:'Skills',
                where:{
                    name : { [Op.or]:a }
                },
                attributes:[],  
            }]
        }).then(us => res.send(us))
        } 
        catch(e){
            console.log(e);
            res.status(500).json({
                message: 'Something goes wrong',
                data: {}
            });
        }
}

function editeProfile(req,res) {
    if(req.user.isclient === true){
        Userprofile.update({
            address: req.body.address,
            education: req.body.education,
            rewards: req.body.rewards,
            birthday: req.body.birthday,
            gender: req.body.gender
            
        },{where:{clientId : req.user.id}})
        .then(p => res.send(p))
        .catch(err => res.send(err))
    }
    else if(req.user.isclient === false){
        Userprofile.update({
            address: req.body.address,
            education: req.body.education,
            rewards: req.body.rewards,
            birthday: req.body.birthday,
            gender: req.body.gender
            
        },{where:{freelancerId : req.user.id}})
        .then(p => res.send(p))
        .catch(err => res.send(err))
    }
}

async function changePass(req,res) {
    let {currentPass,newPass,confirmNewPass} = req.body;
    let hashNewPass = await bcrypt.hash(newPass , 12)
    User.findOne({where: {id:req.user.id}}).then(user=>{
        bcrypt.compare(currentPass,user.password)
                .then(bol => {
                    if(bol){
                        if(newPass!==confirmNewPass){
                            res.send("رمز عبور های جدید یکسان نیستند");
                        }
                        else{
                            User.update({password:hashNewPass},{where:{id:user.id}}).then(res.send("رمز عبور با موفقیت تغییر یافت"))
                        }
                    }
                    else{
                        res.send("رمز عبور فعلی خود را اشتباه وارد کردید")
                    }
                })
    })
        .then(()=>{
            return User.findByPk(req.user.id); 
        })
        .catch(err => {console.log(err);})
}

async function allUsers(req,res) {
    User.findAll().then(users => res.send(users))
}

module.exports = {
    createUser,
    getUserWithId,
    getUser,
    editeProfile,
    changePass,
    updateUser,
    freelancers,
    freelancerWithSpecSkil,
    loginUser,
    confirmingEmail,
    //imageUser,
    allUsers
};