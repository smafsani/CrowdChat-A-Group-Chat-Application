function generateRandomString(){
    let length = Math.floor((Math.random() * 4) + 7);
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
    let result = "";
    let characters_length = characters.length;
    for(var i=0; i<length; i++){
        result += characters.charAt(Math.floor(Math.random() * characters_length));
    }
    return result;

}

module.exports = generateRandomString;