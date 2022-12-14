const jwt = require("jsonwebtoken");
const Users = require("../modules/User");
const checkLogin = async (req, res, next) =>{    
    try {
        req.verified = 0;
        // const token = authorization.split(' ')[1];
        const token = req.cookies[process.env.TOKEN_NAME];
        if(!token){
            req.verified = 0;
            next();
        }
        else{
            const cookieToken = jwt.verify(token, process.env.JWT_SECRET);
            const {email, userID, name} = cookieToken;
            const userInfo = await Users.findOne({_id: userID}).lean();
            if(token == userInfo.token){
                // console.log("Matched!");
                req.email = email;
                req.userID = userID;
                req.name = name;
                req.verified = 1;
                console.log('asdas');
                next();
            }
            else {
                console.log('asdasdsdas');
                next([101, "Login Again"]);
            }
        }
        
    } catch (error) {
        req.verified = 0;
        next();
    }
};

module.exports = checkLogin;