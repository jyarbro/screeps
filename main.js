var workerManager = require('worker-manager');

module.exports.loop = function () {
    cleanMemory();
    workerManager();
}

function cleanMemory() {
    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }
}