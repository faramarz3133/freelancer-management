let Sequelize = require('sequelize');
let Project = require('../models/Project');
let User = require('../models/User');
let Offer = require('../models/Offer');
let Skill = require('../models/Skill');
let Category = require('../models/Category');

async function createProject(req, res) {
    try{
    let id = req.user.id;
    Project.create({
        projectname: req.body.projectname,
        budget : req.body.budget,
        description : req.body.description,
        clientId : id
    })
    .then(project =>{
        if((project)){
            for(let skilll of req.body.skills){
                Skill.findOne({where:{name:skilll.name}})
                .then(skil => {
                    return project.addSkill(skil)
                })
                .catch(err => console.log(err));
            }
        }return project;
    })
    .then(project =>{
        if((project)){
            for(let categ of req.body.categories){
                Category.findOne({where:{name:categ.name}})
                .then(catego => {
                    return project.addCategories(catego)
                })
                .catch(err => console.log(err));
            }
        }return res.send(project);
    })
} catch(e){
    console.log(e);
    res.status(500).json({
        message: 'Something goes wrong',
        data: {}
    });
    }
}

async function allProject(req,res) {
    try{
        Project.findAll({
            include:[{
                model:Skill,
                as:'Skills'
            },{model:Category,
                as: 'Categories'}
            ]
        })
            .then(pro => res.send(pro))
    }
    catch(e){
        console.log(e);
        res.status(500).json({
            message: 'Something goes wrong',
            data: {}
        });
        }
}

async function getProjectWithId(req,res){
    
    Project.findOne({
        include:[{
            model:Skill,
            as:'Skills'
        },{model:Category,
            as: 'Categories'}],
        where: { id: req.body.id}
    })
    .then(project => res.send(project))
}

async function getCategories(req,res) {
    Category.findAll()
        .then(cat => res.send(cat))
}

async function getSkills(req,res) {
    Skill.findAll()
        .then(skill => res.send(skill))
}

async function lancerProject(req,res) {
    try{
        let userskills = await Skill.findAll({
        include:[{
            model:User,
            as:'Workers',
            where:{
                id:req.user.id
            },
            attributes:[],
            }],
        })
    const Op = Sequelize.Op;
    let a=[];
    userskills.forEach(skill=>{
        a.push(skill.id)
    });
    let projects = await Project.findAll({
        where:{paystatus:false},
        include:[{
            model:Skill,
            as:'Skills',
            where:{
                id : { [Op.or]:a }
            },
            attributes:[],  
        }]
    })
    res.json(projects);
    } 
    catch(e){
        console.log(e);
        res.status(500).json({
            message: 'Something goes wrong',
            data: {}
        });
    }
}

async function sendOffer(req,res) {
    try{
        Offer.create({
            comment : req.body.comment,
            timeneeded : req.body.timeneeded,
            price : req.body.price,
            userId : req.user.id,
            projectId : req.body.projectId
        }).then(() => {
            res.send('درخواست شما با موفقیت ارسال شد')
        })
    }
    catch(e){
        console.log(e);
        res.status(500).json({
            message: 'Something goes wrong',
            data: {}
        });
    }
} 

async function clientProject(req,res) {
    try{
        let clientprojects = await Project.findAll({
            include:[{
                model:Offer,
                as:'Offers' 
            }],where: {clientId:req.user.id}
        })
    res.json(clientprojects);
    } 
    catch(e){
        console.log(e);
        res.status(500).json({
            message: 'Something goes wrong',
            data: {}
        });
    }
}

async function seeAllProjectSkill(req,res) {
    try{
    const Op = Sequelize.Op;
    let a=[];
    req.body.s.forEach(skill=>{
        a.push(skill.name)
    });
    let projects = await Project.findAll({
        include:[{
            model:Skill,
            as:'Skills',
            where:{
                name : { [Op.or]:a }
            },
            attributes:[],  
        }]
    })
    res.json(projects);
    } 
    catch(e){
        console.log(e);
        res.status(500).json({
            message: 'Something goes wrong',
            data: {}
        });
    }
}

async function seeAllProjectCategory(req,res) {
    try{
    const Op = Sequelize.Op;
    let a=[];
    req.body.c.forEach(category=>{
        a.push(category.name)
    });
    let projects = await Project.findAll({
        include:[{
            model:Category,
            as:'Categories',
            where:{
                name : { [Op.or]:a }
            },
            attributes:[],  
        }]
    })
    res.json(projects);
    } 
    catch(e){
        console.log(e);
        res.status(500).json({
            message: 'Something goes wrong',
            data: {}
        });
    }
}

async function clientPaidProject(req,res) {
    Project.findAll({where:{clientId:req.user.id,paystatus:true}})
        .then(pro => res.send(pro))
        .catch(err=>res.send(err))
}

async function acceptOneOffer(req,res) {
    const Op = Sequelize.Op;
    let thisoffer = await Offer.findOne({where:{id:req.body.id}});
    let ids = await Offer.findAll({attributes : ['id']},{where:{projectId: thisoffer.projectId}})
    let a=[];
    ids.forEach(i=>{
        if(i.id !=req.body.id){
            a.push(i.id)
        }
    });

    Project.update({paystatus:true, setprice:thisoffer.price, freelancerId:thisoffer.userId},{where:{id: thisoffer.projectId}})
        .then(p => {
            if(p)
            {
                Offer.update({status:true},{where:{id:req.body.id}})
                //Offer.destroy({where:{id : { [Op.or]:a }}})
                res.send(p)
            }
        })
        .catch(err => console.log(err))
}

async function lancerProjectsToDo(req,res) {
    Project.findAll({where:{freelancerId:req.user.id}})
        .then(p => res.send(p))
}

async function myOffers(req , res) {
    Offer.findAll({where:{userId:req.user.id}})
        .then(offer=>res.send(offer));
}

module.exports = {
    myOffers,
    getSkills,
    getCategories,
    getProjectWithId,
    seeAllProjectCategory,
    seeAllProjectSkill,
    createProject,
    clientPaidProject,
    allProject,
    lancerProjectsToDo,
    lancerProject,
    clientProject,
    acceptOneOffer,
    sendOffer
};