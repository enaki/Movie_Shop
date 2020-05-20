let ipDictFails = {};   //dict: ip -> numar_tentative_atac
let blackList = [];     //blocked ips

const unblockIp = ((blockedIp) => function () {
    blackList.splice(blackList.indexOf(blockedIp), 1);
    console.log("Unblocked ip " + blockedIp);
});

module.exports = {
    needToBlockIp: function (client_ip){
        if (blackList.indexOf(client_ip) > -1) {
            return;
        }
        if (!ipDictFails[client_ip]) {
            ipDictFails[client_ip] = 0;
        }
        ipDictFails[client_ip]++;
        if (ipDictFails[client_ip] === 3) {
            ipDictFails[client_ip] = 0;
            blackList.push(client_ip);
            setTimeout(unblockIp(client_ip), 10000);    //block ip for 30 seconds
            console.log("Blocked ip " + client_ip);
            return true;
        }
        return false;
    },
    isIpBlocked: function (client_ip){
        return blackList.includes(client_ip);
    }
}
